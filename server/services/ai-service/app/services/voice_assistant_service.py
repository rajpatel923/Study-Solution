import asyncio
import io
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, ByteString, Union
import base64

import openai
from elevenlabs import save, stream
from elevenlabs.client import ElevenLabs

# Import LangGraph components
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.services.presentation_service import PresentationFeedbackService

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize OpenAI client using the API key from settings
openai_client = openai.Client(api_key=settings.OPENAI_API_KEY)

# Initialize ElevenLabs client
elevenlabs_api_key = settings.ELEVENLABS_API_KEY if hasattr(settings, 'ELEVENLABS_API_KEY') else ""
elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)

# Define voice options for different personas
VOICE_OPTIONS = {
    "young_male": "yoZ06aMxZJJ28mfd3POQ",  # Example younger male voice
    "young_female": "EXAVITQu4vr4xnSDxMaL",  # Example younger female voice
    "mature_male": "pNInz6obpgDQGcFmaJgB",  # Example mature male voice
    "mature_female": "21m00Tcm4TlvDq8ikWAM",  # Example mature female voice
    "default": "21m00Tcm4TlvDq8ikWAM"  # Default voice ID
}

# Silent MP3 file in base64 (1 second of silence)
SILENT_MP3 = b'\xFF\xFB\x90\x44\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'


class PresentationState:
    """Class for managing presentation state"""

    def __init__(self):
        self.current_slide = 0
        self.total_slides = 0
        self.slide_contents = {}  # Dictionary mapping slide numbers to content
        self.presenter_ranges = []  # List of tuples (start, end) for human presenter slides
        self.current_presenter = "ai"  # "ai" or "human"
        self.presentation_active = False
        self.presentation_title = ""
        self.presentation_topic = ""
        self.student_persona = {
            "name": "Alex",
            "age": 20,
            "year": "Sophomore",
            "major": "Computer Science",
            "tone": "enthusiastic but informative",
            "speaking_style": "conversational with occasional academic terminology"
        }
        self.presented_slides = set()  # Track which slides have been presented
        self.human_presented_slides = set()  # Track slides presented by the human


class EnhancedVoiceAssistantService:
    """Enhanced service with presentation and feedback capabilities"""

    def __init__(self,
                 llm_model: str = "gpt-4o",
                 feedback_model: str = "gpt-4o"):
        """Initialize the service with the existing service as a foundation"""
        self.llm_model = llm_model
        self.feedback_service = PresentationFeedbackService(feedback_model)

        # Session data storage
        self.session_data = {}
        self.presentation_states = {}

        # Initialize conversation system components
        self._initialize_conversation_system()

        # Tracking presentation transcriptions for feedback
        self.presentation_transcriptions = {}  # session_id -> {slide_num: transcription}

    def _initialize_conversation_system(self):
        """Initialize the conversation system components"""
        # This method would initialize the LangGraph components for
        # conversation flow. For simplicity, we're assuming this is handled elsewhere
        # or will be implemented separately.
        pass

    async def process_audio(self, audio_data: bytes, session_id: str) -> str:
        """
        Process audio data into text using Whisper API with timeout protection

        Args:
            audio_data (bytes): Raw audio data
            session_id (str): Session identifier

        Returns:
            str: Transcribed text
        """
        try:
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.webm"  # Set a filename with extension

            # Process with Whisper with a timeout
            try:
                # Use asyncio.wait_for to prevent indefinite blocking
                transcription = await asyncio.wait_for(
                    asyncio.to_thread(
                        openai_client.audio.transcriptions.create,
                        file=audio_file,
                        model="whisper-1"
                    ),
                    timeout=10.0  # 10 seconds timeout
                )
            except asyncio.TimeoutError:
                logger.error(f"Timeout while transcribing audio in session {session_id}")
                return "I'm sorry, it's taking too long to process your audio. Could you please try again?"

            # If this is a presentation session, record transcription for feedback
            if session_id in self.presentation_states and self.presentation_states[session_id].presentation_active:
                if self.presentation_states[session_id].current_presenter == "human":
                    current_slide = self.presentation_states[session_id].current_slide
                    # Use create_task to avoid blocking
                    asyncio.create_task(self.record_presentation_transcription(
                        session_id,
                        current_slide,
                        transcription.text
                    ))

                    # Mark this slide as presented by human
                    self.presentation_states[session_id].human_presented_slides.add(current_slide)

            return transcription.text
        except Exception as e:
            logger.error(f"Error transcribing audio in session {session_id}: {e}")
            return "I'm sorry, I couldn't understand the audio. Could you please try again?"

    async def debug_process_presentation_turn_enhanced(
            self,
            session_id: str,
            slide_number: int
    ) -> Tuple[str, bytes]:
        """
        Process a turn in the presentation with enhanced error handling, logging and debugging

        Args:
            session_id: Session identifier
            slide_number: Current slide number

        Returns:
            Tuple[str, bytes]: Assistant's text response and audio response
        """
        if session_id not in self.presentation_states:
            logger.error(f"No active presentation found for session {session_id}")
            return "No active presentation found.", SILENT_MP3

        pres_state = self.presentation_states[session_id]

        # Enhanced logging
        logger.info(f"DEBUG: Processing presentation turn for session {session_id}, slide {slide_number}")
        logger.info(
            f"DEBUG: Total slides: {pres_state.total_slides}, Current presenter: {pres_state.current_presenter}")
        logger.info(f"DEBUG: Slide contents keys: {list(pres_state.slide_contents.keys())}")
        logger.info(f"DEBUG: Student persona: {pres_state.student_persona}")

        if slide_number not in pres_state.slide_contents:
            logger.error(f"DEBUG: Slide {slide_number} not found in slide_contents")
            return f"Slide {slide_number} not found in my content. Please check the slide number.", SILENT_MP3

        # Get slide content
        slide_content = pres_state.slide_contents[slide_number]
        logger.info(f"DEBUG: Retrieved content for slide {slide_number} (length: {len(slide_content)})")

        # Determine if it's AI's turn to present
        is_human_slide = False
        for start, end in pres_state.presenter_ranges:
            if start <= slide_number <= end:
                is_human_slide = True
                pres_state.current_presenter = "human"
                break

        if is_human_slide:
            # If it's human's turn, generate a handoff message
            handoff_text = f"Now it's your turn to present slide {slide_number}. I'll listen and provide feedback afterwards."
            logger.info(f"DEBUG: Human turn for slide {slide_number}, generating handoff")

            # Generate audio with the appropriate voice
            try:
                logger.info(f"DEBUG: Generating audio for handoff message with persona: {pres_state.student_persona}")
                audio_response = await self.generate_speech(
                    handoff_text,
                    persona=pres_state.student_persona
                )
                logger.info(
                    f"DEBUG: Generated handoff audio (size: {len(audio_response) if audio_response else 0} bytes)")
            except Exception as e:
                logger.error(f"DEBUG: Error generating handoff speech for session {session_id}: {e}")
                audio_response = SILENT_MP3

            # Mark this slide as human's
            pres_state.current_presenter = "human"

            return handoff_text, audio_response
        else:
            # If it's AI's turn, generate presentation content
            pres_state.current_presenter = "ai"
            logger.info(f"DEBUG: AI turn for slide {slide_number}, generating presentation")

            try:
                # Log OpenAI API credentials status (do not log the actual keys!)
                logger.info(f"DEBUG: OpenAI API key status: {'Set' if settings.OPENAI_API_KEY else 'Not set'}")
                logger.info(f"DEBUG: LLM model being used: {self.llm_model}")

                # Log information about slide content
                logger.info(f"DEBUG: Slide content sample: {slide_content[:100]}...")

                # Generate presentation for this slide with a timeout and detailed error logging
                try:
                    logger.info(f"DEBUG: Calling generate_slide_presentation for slide {slide_number}")
                    presentation_text = await asyncio.wait_for(
                        self.generate_slide_presentation(
                            session_id,
                            slide_number,
                            slide_content,
                            pres_state.student_persona
                        ),
                        timeout=30.0  # 30 second timeout for generation
                    )
                    logger.info(f"DEBUG: Generated presentation text (length: {len(presentation_text)})")
                    logger.info(f"DEBUG: Presentation text sample: {presentation_text[:100]}...")
                except asyncio.TimeoutError:
                    logger.error(
                        f"DEBUG: Timeout generating presentation for slide {slide_number} in session {session_id}")
                    presentation_text = f"I'll now present slide {slide_number}. " + \
                                        "This slide covers key points related to our topic. " + \
                                        "Let me highlight the main ideas here."
                except Exception as e:
                    logger.error(f"DEBUG: Exception during generate_slide_presentation: {str(e)}")
                    import traceback
                    logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
                    presentation_text = f"I'll now present slide {slide_number}. " + \
                                        "This slide contains important information for our topic."

                # Mark this slide as presented
                pres_state.presented_slides.add(slide_number)

                # Generate audio with the appropriate voice
                logger.info(f"DEBUG: Generating audio for presentation with persona: {pres_state.student_persona}")
                audio_response = await self.generate_speech(
                    presentation_text,
                    persona=pres_state.student_persona
                )
                logger.info(
                    f"DEBUG: Generated presentation audio (size: {len(audio_response) if audio_response else 0} bytes)")

                return presentation_text, audio_response
            except Exception as e:
                logger.error(f"DEBUG: Error during AI turn for session {session_id}, slide {slide_number}: {e}")
                import traceback
                logger.error(f"DEBUG: Error traceback: {traceback.format_exc()}")
                fallback_text = f"I'm having trouble presenting slide {slide_number}. Let's move on to the next slide."
                return fallback_text, SILENT_MP3

    async def debug_generate_slide_presentation(
            self,
            session_id: str,
            slide_number: int,
            slide_content: str,
            student_persona: Dict[str, Any]
    ) -> str:
        """
        Enhanced debugging version of generate_slide_presentation with more error handling

        Args:
            session_id: Session identifier
            slide_number: Slide being presented
            slide_content: Content of the slide
            student_persona: Persona to use for the presentation

        Returns:
            str: Generated presentation text
        """
        # Use ChatOpenAI directly for this simpler task
        logger.info(f"DEBUG: Starting debug_generate_slide_presentation for slide {slide_number}")

        try:
            # Configure OpenAI client with detailed error logging
            logger.info(f"DEBUG: Initializing ChatOpenAI with model={self.llm_model}, temperature=0.7")
            llm = ChatOpenAI(model=self.llm_model, temperature=0.7)

            # Log ChatOpenAI configuration
            logger.info(f"DEBUG: ChatOpenAI configuration: {llm}")

            # Prepare system prompt based on persona
            logger.info(f"DEBUG: Creating system prompt with persona: {student_persona}")
            system_prompt = f"""You are a {student_persona.get('age', '20')}-year-old {student_persona.get('year', 'college')} student 
            named {student_persona.get('name', 'Alex')} majoring in {student_persona.get('major', 'Computer Science')}.
            You are giving a presentation and presenting slide {slide_number}.
            Speak in a {student_persona.get('tone', 'enthusiastic but informative')} tone with a 
            {student_persona.get('speaking_style', 'conversational with occasional academic terminology')} style.
            Keep your presentation of this slide concise and engaging, between 30 seconds to 1 minute in length.
            Don't say "In this slide..." or use similar meta-references.
            Just present the content naturally as if speaking to your class."""

            human_prompt = f"""Here is the content of slide {slide_number}:

            {slide_content}

            Please present this slide content in your own words as part of the larger presentation.
            """

            # Log the prompts
            logger.info(f"DEBUG: System prompt: {system_prompt}")
            logger.info(f"DEBUG: Human prompt: {human_prompt}")

            # Generate presentation text with detailed error handling
            try:
                logger.info(f"DEBUG: Calling LLM to generate presentation text")
                response = await llm.ainvoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=human_prompt)
                ])

                logger.info(f"DEBUG: LLM response: {response}")
                logger.info(f"DEBUG: Response type: {type(response)}")

                presentation_text = response.content
                logger.info(f"DEBUG: Extracted content from response: {presentation_text[:100]}...")

                # Mark this slide as presented
                if session_id in self.presentation_states:
                    self.presentation_states[session_id].presented_slides.add(slide_number)

                return presentation_text
            except Exception as e:
                logger.error(f"DEBUG: Error during LLM invocation: {str(e)}")
                import traceback
                logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

                # Log detailed OpenAI configuration
                try:
                    logger.error(f"DEBUG: OpenAI API key status: {'Set' if settings.OPENAI_API_KEY else 'Not set'}")
                    logger.error(f"DEBUG: OpenAI API base: {openai_client.base_url}")
                except Exception as config_error:
                    logger.error(f"DEBUG: Error accessing OpenAI configuration: {config_error}")

                # Provide a simple fallback
                return f"Let me present slide {slide_number}. This slide covers important information related to our topic."
        except Exception as e:
            logger.error(f"DEBUG: Error in debug_generate_slide_presentation: {e}")
            import traceback
            logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
            # Provide a simple fallback
            return f"Let me present slide {slide_number}. This slide contains key information for our presentation."

    async def select_voice_for_persona(self, persona: Dict[str, Any]) -> str:
        """
        Select the appropriate voice ID based on persona details

        Args:
            persona: Dict with persona details including age, gender, etc.

        Returns:
            str: ElevenLabs voice ID
        """
        # Default to young male if not specified
        voice_type = "default"

        # Determine voice based on age and gender (if available)
        age = persona.get("age", 20)
        gender = persona.get("gender", "male").lower()

        if age < 25:
            voice_type = f"young_{gender}" if f"young_{gender}" in VOICE_OPTIONS else "young_male"
        else:
            voice_type = f"mature_{gender}" if f"mature_{gender}" in VOICE_OPTIONS else "mature_male"

        # Return the voice ID
        return VOICE_OPTIONS.get(voice_type, VOICE_OPTIONS["default"])

    async def generate_speech(self, text: str, voice_id: str = None, persona: Dict[str, Any] = None) -> bytes:
        """
        Convert text to speech using ElevenLabs API with improved error handling and timeout

        Args:
            text (str): Text to convert to speech
            voice_id (str, optional): Voice ID to use for synthesis
            persona (Dict[str, Any], optional): Persona details to select appropriate voice

        Returns:
            bytes: Audio data
        """
        try:
            # If persona is provided, select an appropriate voice
            if persona and not voice_id:
                voice_id = await self.select_voice_for_persona(persona)
            elif not voice_id:
                voice_id = VOICE_OPTIONS["default"]

            # Check if ElevenLabs API key is set
            if not elevenlabs_api_key:
                logger.warning("ElevenLabs API key not set. Using placeholder audio response.")
                # Return a small placeholder MP3 (silent)
                return SILENT_MP3

            # Log the API key status (not the actual key!)
            logger.info(f"ElevenLabs API key status: {'Set' if elevenlabs_api_key else 'Not set'}")
            logger.info(f"Generating speech for text of length: {len(text)}")
            logger.info(f"Using voice ID: {voice_id}")

            # Generate audio using the client API with timeout
            try:
                raw_audio = await asyncio.wait_for(
                    asyncio.to_thread(
                        elevenlabs_client.text_to_speech.convert,
                        text=text,
                        voice_id=voice_id,
                        model_id="eleven_turbo_v2",
                        output_format="mp3_44100_128"
                    ),
                    timeout=60.0  # 60 seconds timeout
                )

                if hasattr(raw_audio, '__iter__') and not isinstance(raw_audio, (bytes, bytearray)):
                    audio = b''.join(raw_audio)
                else:
                    audio = raw_audio

                logger.info(f"Successfully generated audio, size: {len(audio)} bytes")
                return audio
            except asyncio.TimeoutError:
                logger.error(f"Timeout while generating speech for text: {text[:50]}...")
                # Return silent audio as fallback
                return SILENT_MP3

        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            # Return silent audio in case of failure
            return SILENT_MP3

    async def record_presentation_transcription(
            self,
            session_id: str,
            slide_number: int,
            transcription: str
    ):
        """
        Record transcription for a presentation slide for later feedback

        Args:
            session_id: Session identifier
            slide_number: Slide being presented
            transcription: Transcribed text from the presenter
        """
        if session_id not in self.presentation_transcriptions:
            self.presentation_transcriptions[session_id] = {}

        # Append to existing transcription if available
        if slide_number in self.presentation_transcriptions[session_id]:
            self.presentation_transcriptions[session_id][slide_number] += f"\n{transcription}"
        else:
            self.presentation_transcriptions[session_id][slide_number] = transcription

        # Add to presented slides
        if session_id in self.presentation_states:
            self.presentation_states[session_id].presented_slides.add(slide_number)

            # If current presenter is human, add to human presented slides
            if self.presentation_states[session_id].current_presenter == "human":
                self.presentation_states[session_id].human_presented_slides.add(slide_number)

        logger.info(f"Recorded transcription for slide {slide_number} in session {session_id}")

    async def generate_slide_presentation(
            self,
            session_id: str,
            slide_number: int,
            slide_content: str,
            student_persona: Dict[str, Any]
    ) -> str:
        """
        Generate AI presentation for a slide

        Args:
            session_id: Session identifier
            slide_number: Slide being presented
            slide_content: Content of the slide
            student_persona: Persona to use for the presentation

        Returns:
            str: Generated presentation text
        """
        # Use ChatOpenAI directly for this simpler task


        # llm = ChatOpenAI(model=self.llm_model, temperature=0.7)
        #
        # # Prepare system prompt based on persona
        # system_prompt = f"""You are a {student_persona.get('age', '20')}-year-old {student_persona.get('year', 'college')} student
        # named {student_persona.get('name', 'Alex')} majoring in {student_persona.get('major', 'Computer Science')}.
        # You are giving a presentation and presenting slide {slide_number}.
        # Speak in a {student_persona.get('tone', 'enthusiastic but informative')} tone with a
        # {student_persona.get('speaking_style', 'conversational with occasional academic terminology')} style.
        # Keep your presentation of this slide concise and engaging, between 30 seconds to 1 minute in length.
        # Don't say "In this slide..." or use similar meta-references.
        # Just present the content naturally as if speaking to your class."""
        #
        # human_prompt = f"""Here is the content of slide {slide_number}:
        #
        # {slide_content}
        #
        # Please present this slide content in your own words as part of the larger presentation.
        # """
        #
        # try:
        #     # Generate presentation text
        #     response = await llm.ainvoke([
        #         SystemMessage(content=system_prompt),
        #         HumanMessage(content=human_prompt)
        #     ])
        #
        #     # Mark this slide as presented
        #     if session_id in self.presentation_states:
        #         self.presentation_states[session_id].presented_slides.add(slide_number)
        #
        #     return response.content
        # except Exception as e:
        #     logger.error(f"Error generating slide presentation: {e}")
        #     # Provide a simple fallback
        #     return f"Let me present slide {slide_number}. This slide covers important information related to our topic."


        logger.info(f"Called generate_slide_presentation for session {session_id}, slide {slide_number}")
        return await self.debug_generate_slide_presentation(
            session_id, slide_number, slide_content, student_persona
        )

    async def generate_presentation_feedback(
            self,
            session_id: str,
            slide_numbers: List[int],
            slide_contents: Dict[int, str],
            presenter_persona: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate feedback for presenter slides

        Args:
            session_id: Session identifier
            slide_numbers: List of slide numbers the user presented
            slide_contents: Mapping of slide numbers to content
            presenter_persona: Optional persona information for tailored feedback

        Returns:
            Dict with feedback information
        """
        if session_id not in self.presentation_transcriptions:
            return {
                "error": "No presentation transcriptions found for this session",
                "feedback_text": "Unable to provide feedback without presentation recording."
            }

        # Combine transcriptions for all presented slides
        combined_transcription = ""
        combined_slide_content = ""

        for slide_num in slide_numbers:
            if slide_num in self.presentation_transcriptions[session_id]:
                combined_transcription += f"Slide {slide_num}: {self.presentation_transcriptions[session_id][slide_num]}\n\n"

            if slide_num in slide_contents:
                combined_slide_content += f"Slide {slide_num}: {slide_contents[slide_num]}\n\n"

        if not combined_transcription:
            return {
                "error": "No transcriptions found for the specified slides",
                "feedback_text": "Unable to provide feedback without presentation recording."
            }

        # Generate feedback using OpenAI directly if feedback service is not available
        try:
            feedback_text, feedback_structure = await self.feedback_service.generate_presentation_feedback(
                combined_transcription,
                combined_slide_content,
                presenter_persona
            )
        except Exception as e:
            logger.error(f"Error using feedback service: {e}. Falling back to direct OpenAI.")

            # Fallback to direct OpenAI call
            llm = ChatOpenAI(model=self.llm_model, temperature=0.5)

            system_message = """You are an experienced professor giving feedback on a student presentation.
            Your feedback should be constructive, specific, and actionable.
            Focus on both content and delivery aspects of the presentation."""

            human_message = f"""Please analyze this student presentation:

            SLIDE CONTENT:
            {combined_slide_content}

            STUDENT'S PRESENTATION:
            {combined_transcription}

            Provide detailed feedback focusing on:
            1. Content clarity and accuracy
            2. Delivery style and effectiveness
            3. Specific strengths to continue
            4. Areas for improvement with actionable suggestions
            """

            response = await llm.ainvoke([
                SystemMessage(content=system_message),
                HumanMessage(content=human_message)
            ])

            feedback_text = response.content
            feedback_structure = {
                "strengths": [],
                "areas_for_improvement": [],
                "overall_assessment": "Feedback generated without structured analysis."
            }

        return {
            "feedback_text": feedback_text,
            "structured_feedback": feedback_structure,
            "slides_analyzed": slide_numbers
        }

    def setup_presentation(
            self,
            session_id: str,
            slide_contents: Dict[int, str],
            presenter_ranges: List[Tuple[int, int]],
            presentation_title: str = "",
            presentation_topic: str = "",
            student_persona: Dict[str, str] = None
    ) -> bool:
        """
        Setup a new presentation session

        Args:
            session_id (str): Session identifier
            slide_contents (Dict[int, str]): Mapping of slide numbers to content
            presenter_ranges (List[Tuple[int, int]]): Ranges of slides for human presenter
            presentation_title (str): Title of the presentation
            presentation_topic (str): Topic of the presentation
            student_persona (Dict[str, str]): Custom student persona details

        Returns:
            bool: Success status
        """
        try:
            # Log what we're doing
            logger.info(f"Setting up presentation for session {session_id}")
            logger.info(f"Slide contents has {len(slide_contents)} slides")
            logger.info(f"Presenter ranges: {presenter_ranges}")

            # Create new presentation state
            pres_state = PresentationState()

            # Set presentation details
            pres_state.current_slide = 1  # Start at slide 1
            pres_state.total_slides = max(slide_contents.keys()) if slide_contents else 0
            pres_state.slide_contents = slide_contents
            pres_state.presenter_ranges = presenter_ranges
            pres_state.presentation_active = True
            pres_state.presentation_title = presentation_title
            pres_state.presentation_topic = presentation_topic

            # Update persona if provided
            if student_persona:
                pres_state.student_persona.update(student_persona)

            # Determine initial presenter
            pres_state.current_presenter = "ai"  # Default to AI
            for start, end in presenter_ranges:
                if start <= 1 <= end:  # If slide 1 is in human range
                    pres_state.current_presenter = "human"
                    break

            # Store the presentation state
            self.presentation_states[session_id] = pres_state
            logger.info(f"Stored presentation state for session {session_id}")

            # Initialize or reset conversation for this session
            if session_id not in self.session_data:
                self.session_data[session_id] = {
                    "messages": []
                }

            # Add initial system message to set context
            system_message = f"""You are a {pres_state.student_persona['age']}-year-old {pres_state.student_persona['year']} college student named {pres_state.student_persona['name']} majoring in {pres_state.student_persona['major']}. 
            You're giving a presentation titled "{presentation_title}" about {presentation_topic}. 
            You'll present slides {', '.join([str(i) for i in range(1, pres_state.total_slides + 1) if not any(start <= i <= end for start, end in presenter_ranges)])}.
            Your human partner will present slides {', '.join([f"{start}-{end}" for start, end in presenter_ranges])}.
            Speak in a {pres_state.student_persona['tone']} tone with a {pres_state.student_persona['speaking_style']}.
            """

            # Add the system message
            self.session_data[session_id]["messages"].append({"role": "system", "content": system_message})
            logger.info(f"Added system message for session {session_id}")

            # Reset presentation tracking data
            self.presentation_transcriptions[session_id] = {}

            # Verify that the presentation state was stored correctly
            if session_id in self.presentation_states:
                logger.info(f"Successfully set up presentation for session {session_id}")
                return True
            else:
                logger.error(f"Failed to verify presentation state for session {session_id}")
                return False
        except Exception as e:
            logger.error(f"Error setting up presentation for session {session_id}: {e}")
            # Try to log more detailed error information
            import traceback
            logger.error(f"Error details: {traceback.format_exc()}")
            return False

    def end_presentation(self, session_id: str) -> bool:
        """
        End a presentation session

        Args:
            session_id (str): Session identifier

        Returns:
            bool: Success status
        """
        if session_id in self.presentation_states:
            self.presentation_states[session_id].presentation_active = False
            return True
        return False

    def get_presentation_state(self, session_id: str) -> Dict[str, Any]:
        """
        Get the current presentation state

        Args:
            session_id (str): Session identifier

        Returns:
            Dict[str, Any]: Current presentation state
        """
        if session_id not in self.presentation_states:
            return {"error": "No presentation found for this session"}

        pres_state = self.presentation_states[session_id]

        return {
            "current_slide": pres_state.current_slide,
            "total_slides": pres_state.total_slides,
            "current_presenter": pres_state.current_presenter,
            "presentation_active": pres_state.presentation_active,
            "presentation_title": pres_state.presentation_title,
            "presentation_topic": pres_state.presentation_topic,
            "student_persona": pres_state.student_persona,
            "presented_slides": list(pres_state.presented_slides),
            "human_presented_slides": list(pres_state.human_presented_slides)
        }

    def advance_slide(self, session_id: str) -> Dict[str, Any]:
        """
        Advance to the next slide

        Args:
            session_id (str): Session identifier

        Returns:
            Dict[str, Any]: Updated slide information and presenter turn
        """
        if session_id not in self.presentation_states:
            return {"error": "No presentation found for this session"}

        pres_state = self.presentation_states[session_id]

        if pres_state.current_slide >= pres_state.total_slides:
            return {"error": "Already at the last slide"}

        pres_state.current_slide += 1

        # Determine if current slide is in human presenter range
        is_human_slide = False
        for start, end in pres_state.presenter_ranges:
            if start <= pres_state.current_slide <= end:
                is_human_slide = True
                pres_state.current_presenter = "human"
                break

        if not is_human_slide:
            pres_state.current_presenter = "ai"

        return {
            "slide_number": pres_state.current_slide,
            "presenter": pres_state.current_presenter,
            "total_slides": pres_state.total_slides,
            "content": pres_state.slide_contents.get(pres_state.current_slide, "No content available")
        }

    def get_current_slide_content(self, session_id: str) -> Union[str, Dict[str, str]]:
        """
        Get the content of the current slide

        Args:
            session_id (str): Session identifier

        Returns:
            Union[str, Dict[str, str]]: Slide content or error message
        """
        if session_id not in self.presentation_states:
            return {"error": "No presentation found for this session"}

        pres_state = self.presentation_states[session_id]
        current_slide = pres_state.current_slide

        if current_slide not in pres_state.slide_contents:
            return {"error": f"Slide {current_slide} not found"}

        return pres_state.slide_contents[current_slide]

    def get_slide_content(self, session_id: str, slide_number: int) -> Union[str, Dict[str, str]]:
        """
        Get the content of a specific slide

        Args:
            session_id (str): Session identifier
            slide_number (int): Slide number

        Returns:
            Union[str, Dict[str, str]]: Slide content or error message
        """
        if session_id not in self.presentation_states:
            return {"error": "No presentation found for this session"}

        pres_state = self.presentation_states[session_id]

        if slide_number not in pres_state.slide_contents:
            return {"error": f"Slide {slide_number} not found"}

        return pres_state.slide_contents[slide_number]

    def set_slide(self, session_id: str, slide_number: int) -> Dict[str, Any]:
        """
        Set the current slide to a specific number

        Args:
            session_id (str): Session identifier
            slide_number (int): Slide number to set

        Returns:
            Dict[str, Any]: Updated slide information and presenter turn
        """
        if session_id not in self.presentation_states:
            return {"error": "No presentation found for this session"}

        pres_state = self.presentation_states[session_id]

        if slide_number < 1 or slide_number > pres_state.total_slides:
            return {"error": f"Slide number must be between 1 and {pres_state.total_slides}"}

        # Set current slide
        pres_state.current_slide = slide_number

        # Determine if current slide is in human presenter range
        is_human_slide = False
        for start, end in pres_state.presenter_ranges:
            if start <= slide_number <= end:
                is_human_slide = True
                pres_state.current_presenter = "human"
                break

        if not is_human_slide:
            pres_state.current_presenter = "ai"

        return {
            "slide_number": pres_state.current_slide,
            "presenter": pres_state.current_presenter,
            "total_slides": pres_state.total_slides,
            "content": pres_state.slide_contents.get(pres_state.current_slide, "No content available")
        }

    async def process_presentation_turn_enhanced(
            self,
            session_id: str,
            slide_number: int
    ) -> Tuple[str, bytes]:
        """
        Process a turn in the presentation with enhanced error handling and logging

        Args:
            session_id: Session identifier
            slide_number: Current slide number

        Returns:
            Tuple[str, bytes]: Assistant's text response and audio response
        """
        if session_id not in self.presentation_states:
            logger.error(f"No active presentation found for session {session_id}")
            return "No active presentation found.", SILENT_MP3

        pres_state = self.presentation_states[session_id]

        # Enhanced logging
        logger.info(f"Processing presentation turn for session {session_id}, slide {slide_number}")
        logger.info(f"Total slides: {pres_state.total_slides}, Current presenter: {pres_state.current_presenter}")
        logger.info(f"Slide contents keys: {list(pres_state.slide_contents.keys())}")

        if slide_number not in pres_state.slide_contents:
            logger.error(f"Slide {slide_number} not found in slide_contents")
            return f"Slide {slide_number} not found in my content. Please check the slide number.", SILENT_MP3

        # Get slide content
        slide_content = pres_state.slide_contents[slide_number]
        logger.info(f"Retrieved content for slide {slide_number} (length: {len(slide_content)})")

        # Determine if it's AI's turn to present
        is_human_slide = False
        for start, end in pres_state.presenter_ranges:
            if start <= slide_number <= end:
                is_human_slide = True
                pres_state.current_presenter = "human"
                break

        if is_human_slide:
            # If it's human's turn, generate a handoff message
            handoff_text = f"Now it's your turn to present slide {slide_number}. I'll listen and provide feedback afterwards."
            logger.info(f"Human turn for slide {slide_number}, generating handoff")

            # Generate audio with the appropriate voice
            try:
                audio_response = await self.generate_speech(
                    handoff_text,
                    persona=pres_state.student_persona
                )
                logger.info(f"Generated handoff audio (size: {len(audio_response) if audio_response else 0} bytes)")
            except Exception as e:
                logger.error(f"Error generating handoff speech for session {session_id}: {e}")
                audio_response = SILENT_MP3

            # Mark this slide as human's
            pres_state.current_presenter = "human"

            return handoff_text, audio_response
        else:
            # If it's AI's turn, generate presentation content
            pres_state.current_presenter = "ai"
            logger.info(f"AI turn for slide {slide_number}, generating presentation")

            try:
                # Generate presentation for this slide with a timeout
                try:
                    presentation_text = await asyncio.wait_for(
                        self.generate_slide_presentation(
                            session_id,
                            slide_number,
                            slide_content,
                            pres_state.student_persona
                        ),
                        timeout=20.0  # Increased timeout for more reliable generation
                    )
                    logger.info(f"Generated presentation text (length: {len(presentation_text)})")
                except asyncio.TimeoutError:
                    logger.error(f"Timeout generating presentation for slide {slide_number} in session {session_id}")
                    presentation_text = f"I'll now present slide {slide_number}. " + \
                                        "This slide covers key points related to our topic. " + \
                                        "Let me highlight the main ideas here."

                # Mark this slide as presented
                pres_state.presented_slides.add(slide_number)

                # Generate audio with the appropriate voice
                audio_response = await self.generate_speech(
                    presentation_text,
                    persona=pres_state.student_persona
                )
                logger.info(
                    f"Generated presentation audio (size: {len(audio_response) if audio_response else 0} bytes)")

                return presentation_text, audio_response
            except Exception as e:
                logger.error(f"Error during AI turn for session {session_id}, slide {slide_number}: {e}")
                fallback_text = f"I'm having trouble presenting slide {slide_number}. Let's move on to the next slide."
                return fallback_text, SILENT_MP3

    async def process_presentation_turn(self, session_id: str, slide_number: int) -> Tuple[str, bytes]:
        """
        Process a turn in the presentation with better debugging

        Args:
            session_id: Session identifier
            slide_number: Current slide number

        Returns:
            Tuple[str, bytes]: Assistant's text response and audio response
        """
        # Use the enhanced debug version
        logger.info(f"Called process_presentation_turn for session {session_id}, slide {slide_number}")
        return await self.debug_process_presentation_turn_enhanced(session_id, slide_number)

    async def process_conversation(self, session_id: str, user_message: str) -> Tuple[str, bytes]:
        """
        Process a user message and return an assistant response

        Args:
            session_id (str): Session identifier
            user_message (str): User's message text

        Returns:
            Tuple[str, bytes]: Assistant's text response and audio response
        """
        # Check if this is a presentation session
        is_presentation = False
        if session_id in self.presentation_states and self.presentation_states[session_id].presentation_active:
            is_presentation = True

        # Check for presentation control commands
        if is_presentation:
            # Check if this is a presentation control command
            lower_message = user_message.lower()

            # Handle "next slide" command
            if "next slide" in lower_message or "advance slide" in lower_message or "go to next slide" in lower_message:
                slide_info = self.advance_slide(session_id)

                if "error" in slide_info:
                    # Check if we've reached the end of the presentation
                    if "last slide" in slide_info["error"].lower():
                        return await self.handle_presentation_completion(session_id)
                    return slide_info["error"], SILENT_MP3

                # Process the presentation turn for the new slide
                return await self.process_presentation_turn(
                    session_id,
                    slide_info["slide_number"]
                )

            # Handle "end presentation" command
            elif "end presentation" in lower_message or "finish presentation" in lower_message:
                self.end_presentation(session_id)

                # Generate conclusion message
                conclusion_text = f"The presentation has concluded. Thank you for presenting with me today!"
                audio_response = await self.generate_speech(
                    conclusion_text,
                    persona=self.presentation_states[session_id].student_persona
                )

                return conclusion_text, audio_response

            # Handle "give feedback" command
            elif "feedback" in lower_message and ("presentation" in lower_message or "how did i do" in lower_message):
                # Get the slides the human presented
                human_slides = []
                pres_state = self.presentation_states[session_id]

                # Use the human_presented_slides set instead of inferring from ranges
                human_slides = list(pres_state.human_presented_slides)

                if not human_slides:
                    return "I don't have any slides to provide feedback on. You didn't present any slides in this session.", SILENT_MP3

                # Get slide contents
                slide_contents = {}
                for slide_num in human_slides:
                    content = self.get_slide_content(session_id, slide_num)
                    if not isinstance(content, dict) or "error" not in content:
                        slide_contents[slide_num] = content

                # Generate feedback
                feedback = await self.generate_presentation_feedback(
                    session_id,
                    human_slides,
                    slide_contents,
                    pres_state.student_persona
                )

                feedback_text = feedback.get("feedback_text", "I couldn't generate feedback at this time.")
                audio_response = await self.generate_speech(
                    feedback_text,
                    persona=pres_state.student_persona
                )

                return feedback_text, audio_response

            # Check if it's human's turn to present
            elif self.presentation_states[session_id].current_presenter == "human":
                # Record the transcription for feedback later
                current_slide = self.presentation_states[session_id].current_slide
                await self.record_presentation_transcription(session_id, current_slide, user_message)

                # Provide acknowledgment that we're listening
                acknowledgment = "I'm listening to your presentation. Continue when you're ready, or say 'next slide' to advance."
                audio_response = await self.generate_speech(
                    acknowledgment,
                    persona=self.presentation_states[session_id].student_persona
                )

                return acknowledgment, audio_response

        # Initialize session if it doesn't exist
        if session_id not in self.session_data:
            self.session_data[session_id] = {
                "messages": []
            }

        # For non-presentation handling, use a simple LLM call
        # In a real implementation, this would use LangGraph
        response_text = ""

        try:
            # Simple implementation using OpenAI directly
            messages = self.session_data[session_id]["messages"]

            # Add user message to history
            messages.append({"role": "user", "content": user_message})

            # Special handling for presentation mode
            system_message = "You are a helpful assistant."
            if is_presentation:
                pres_state = self.presentation_states[session_id]
                system_message = f"""You are a {pres_state.student_persona['age']}-year-old {pres_state.student_persona['year']} college student 
                named {pres_state.student_persona['name']} majoring in {pres_state.student_persona['major']}. 
                You're giving a presentation about {pres_state.presentation_topic}.
                Speak in a {pres_state.student_persona['tone']} tone with a {pres_state.student_persona['speaking_style']}.
                """

            # Add system message if not present
            has_system = any(msg.get("role") == "system" for msg in messages)
            if not has_system:
                messages.insert(0, {"role": "system", "content": system_message})

            # Call OpenAI
            response = await asyncio.to_thread(
                openai_client.chat.completions.create,
                model=self.llm_model,
                messages=messages
            )

            response_text = response.choices[0].message.content

            # Add assistant response to history
            messages.append({"role": "assistant", "content": response_text})

        except Exception as e:
            logger.error(f"Error processing conversation: {e}")
            response_text = "I'm sorry, I encountered an error processing your message."

        # Generate speech based on response text
        voice_id = None
        if is_presentation:
            voice_id = await self.select_voice_for_persona(self.presentation_states[session_id].student_persona)

        audio_response = await self.generate_speech(response_text, voice_id)

        return response_text, audio_response

    async def generate_comprehensive_feedback(
            self,
            session_id: str,
            full_analysis: bool = False
    ) -> Tuple[str, bytes]:
        """
        Generate comprehensive feedback on the user's presentation

        Args:
            session_id: Session identifier
            full_analysis: Whether to perform a detailed analysis

        Returns:
            Tuple[str, bytes]: Text feedback and audio response
        """
        if session_id not in self.presentation_states:
            return "No presentation data found for feedback.", SILENT_MP3

        if session_id not in self.presentation_transcriptions:
            return "No presentation recordings found for feedback.", SILENT_MP3

        pres_state = self.presentation_states[session_id]

        # Get the slides the human presented
        human_slides = list(pres_state.human_presented_slides)

        if not human_slides:
            return "I don't have any recording of your presentation to provide feedback on.", SILENT_MP3

        # Get slide contents and transcriptions
        slide_contents = {}
        transcriptions = {}
        for slide_num in human_slides:
            if slide_num in pres_state.slide_contents:
                slide_contents[slide_num] = pres_state.slide_contents[slide_num]
            if slide_num in self.presentation_transcriptions[session_id]:
                transcriptions[slide_num] = self.presentation_transcriptions[session_id][slide_num]

        # Use more sophisticated feedback generation
        system_prompt = """You are an experienced presentation coach giving feedback to a student.
        Analyze the content and delivery of their presentation compared to the slide content.
        Be constructive, specific, and encouraging. 
        Focus on both strengths and areas for improvement.

        Structure your feedback in these sections:
        1. Overall Impression (2-3 sentences)
        2. Content Coverage (how well the presenter covered the slide content)
        3. Delivery Style (pacing, clarity, engagement)
        4. Specific Strengths (2-3 points)
        5. Areas for Growth (2-3 actionable suggestions)
        6. Final Encouragement (1-2 sentences)
        """

        human_prompt = f"""I need to provide feedback on a presentation. 

        PRESENTATION SLIDES CONTENT:
        {json.dumps(slide_contents, indent=2)}

        PRESENTER'S ACTUAL TRANSCRIPTIONS:
        {json.dumps(transcriptions, indent=2)}

        Please provide structured feedback as outlined in the system instructions.
        """

        # Use OpenAI API for feedback generation
        try:
            # Call OpenAI with improved reliability
            llm = ChatOpenAI(model=self.llm_model, temperature=0.5)

            response = await llm.ainvoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])

            feedback_text = response.content

            # Generate audio for the feedback
            audio_response = await self.generate_speech(
                feedback_text,
                persona={"age": 35, "gender": "female", "tone": "professional"}  # Use a coaching persona
            )

            return feedback_text, audio_response
        except Exception as e:
            logger.error(f"Error generating presentation feedback: {e}")
            return "I encountered an error while generating your presentation feedback. Please try again later.", SILENT_MP3

    async def handle_presentation_completion(
            self,
            session_id: str
    ) -> Tuple[str, bytes]:
        """
        Handle the completion of a presentation and generate summary feedback

        Args:
            session_id: Session identifier

        Returns:
            Tuple[str, bytes]: Completion message and audio response
        """
        # End the presentation
        self.end_presentation(session_id)

        # Generate a completion message
        completion_text = "You've completed your presentation. Would you like me to provide feedback on your presentation?"

        # Get the feedback right away if we have transcriptions
        if session_id in self.presentation_transcriptions and self.presentation_transcriptions[session_id]:
            feedback_text, feedback_audio = await self.generate_comprehensive_feedback(session_id)

            # Combine completion and feedback
            full_text = f"{completion_text}\n\n{feedback_text}"

            # Generate audio for the combined message
            audio_response = await self.generate_speech(full_text)

            return full_text, audio_response
        else:
            # Just send the completion message if no transcriptions
            audio_response = await self.generate_speech(completion_text)
            return completion_text, audio_response


# Initialize the voice assistant service
voice_assistant_service = EnhancedVoiceAssistantService()