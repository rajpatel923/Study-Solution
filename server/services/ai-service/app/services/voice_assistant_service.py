import asyncio
import io
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, ByteString, Union

import openai
from elevenlabs import save, stream
from elevenlabs.client import ElevenLabs

# Import LangGraph components
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

from app.config import get_settings
from app.utils.powerpoint_utils import process_powerpoint_from_base64
from app.services.presentation_service import PresentationFeedbackService

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize OpenAI client using the API key from settings
openai_client = openai.Client(api_key=settings.OPENAI_API_KEY)

# Initialize ElevenLabs client
elevenlabs_client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY if hasattr(settings, 'ELEVENLABS_API_KEY') else "")

# Define voice options for different personas
VOICE_OPTIONS = {
    "young_male": "yoZ06aMxZJJ28mfd3POQ",  # Example younger male voice
    "young_female": "EXAVITQu4vr4xnSDxMaL",  # Example younger female voice
    "mature_male": "pNInz6obpgDQGcFmaJgB",  # Example mature male voice
    "mature_female": "21m00Tcm4TlvDq8ikWAM",  # Example mature female voice
    "default": "21m00Tcm4TlvDq8ikWAM"  # Default voice ID
}


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


class EnhancedVoiceAssistantService:
    """Enhanced service with presentation and feedback capabilities"""

    def __init__(self,
                 llm_model: str = "gpt-4-turbo",
                 feedback_model: str = "gpt-4-turbo"):
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

            return transcription.text
        except Exception as e:
            logger.error(f"Error transcribing audio in session {session_id}: {e}")
            return "I'm sorry, I couldn't understand the audio. Could you please try again?"

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

            # Fallback to default if voice_id is not set
            if not voice_id:
                voice_id = VOICE_OPTIONS["default"]

            # Check if ElevenLabs API key is set
            if not hasattr(settings, 'ELEVENLABS_API_KEY') or not settings.ELEVENLABS_API_KEY:
                logger.warning("ElevenLabs API key not set. Using placeholder audio response.")
                # Return a small placeholder MP3 (silent)
                return b""

            # Generate audio using the client API with timeout
            try:
                audio = await asyncio.wait_for(
                    asyncio.to_thread(
                        elevenlabs_client.text_to_speech.convert,
                        text=text,
                        voice_id=voice_id,
                        model_id="eleven_turbo_v2",
                        output_format="mp3_44100_128"
                    ),
                    timeout=15.0  # 15 seconds timeout
                )

                return audio
            except asyncio.TimeoutError:
                logger.error(f"Timeout while generating speech for text: {text[:50]}...")
                # Create a simple silent audio as fallback
                return b""

        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            # Return a small placeholder MP3 (silent) in case of failure
            return b""

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
        llm = ChatOpenAI(model=self.llm_model, temperature=0.7)

        # Prepare system prompt based on persona
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

        # Generate presentation text
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ])

        return response.content

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

    # Update this method in your voice_assistant_service.py file

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
            "student_persona": pres_state.student_persona
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

    async def process_presentation_turn(
            self,
            session_id: str,
            slide_number: int
    ) -> Tuple[str, bytes]:
        """
        Process a turn in the presentation with improved error handling

        Args:
            session_id: Session identifier
            slide_number: Current slide number

        Returns:
            Tuple[str, bytes]: Assistant's text response and audio response
        """
        if session_id not in self.presentation_states:
            return "No active presentation found.", b""

        pres_state = self.presentation_states[session_id]

        if slide_number not in pres_state.slide_contents:
            return f"Slide {slide_number} not found.", b""

        # Get slide content
        slide_content = pres_state.slide_contents[slide_number]

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

            # Generate audio with the appropriate voice
            try:
                audio_response = await self.generate_speech(
                    handoff_text,
                    persona=pres_state.student_persona
                )
            except Exception as e:
                logger.error(f"Error generating handoff speech for session {session_id}: {e}")
                audio_response = b""

            return handoff_text, audio_response
        else:
            # If it's AI's turn, generate presentation content
            pres_state.current_presenter = "ai"

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
                        timeout=15.0  # 15 seconds timeout
                    )
                except asyncio.TimeoutError:
                    logger.error(f"Timeout generating presentation for slide {slide_number} in session {session_id}")
                    presentation_text = f"I'll now present slide {slide_number}. " + \
                                        "This slide covers key points related to our topic. " + \
                                        "Let me highlight the main ideas here."

                # Generate audio with the appropriate voice
                audio_response = await self.generate_speech(
                    presentation_text,
                    persona=pres_state.student_persona
                )

                return presentation_text, audio_response
            except Exception as e:
                logger.error(f"Error during AI turn for session {session_id}, slide {slide_number}: {e}")
                fallback_text = f"I'm having trouble presenting slide {slide_number}. Let's move on to the next slide."
                return fallback_text, b""

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
                    return slide_info["error"], b""

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
            elif "feedback" in lower_message and "presentation" in lower_message:
                # Get the slides the human presented
                human_slides = []
                pres_state = self.presentation_states[session_id]

                for start, end in pres_state.presenter_ranges:
                    for slide_num in range(start, end + 1):
                        human_slides.append(slide_num)

                if not human_slides:
                    return "I don't have any slides to provide feedback on. You didn't present any slides in this session.", b""

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


voice_assistant_service = EnhancedVoiceAssistantService()