import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph

# Configure logging
logger = logging.getLogger(__name__)


class PresentationFeedbackService:
    """Service for providing feedback on presentations"""

    def __init__(self, llm_model: str = "gpt-4-turbo"):
        """Initialize with specific model"""
        self.llm_model = llm_model
        self.feedback_graph = self._build_feedback_graph()

    def _build_feedback_graph(self):
        """Build LangGraph for analyzing presentations and providing feedback"""

        # Define specialized tools for presentation analysis
        @tool
        def analyze_presentation_delivery(transcription: str) -> Dict[str, Any]:
            """
            Analyze presentation delivery aspects like pace, clarity, and engagement.

            Args:
                transcription: Transcribed text from the presenter's speech

            Returns:
                Dict with analysis of delivery aspects
            """
            # This is a placeholder - the actual implementation will use the LLM
            return {
                "pace": "moderate",
                "clarity": "high",
                "engagement": "good",
                "filler_words": ["um", "like"],
                "filler_word_count": 12
            }

        @tool
        def analyze_presentation_content(transcription: str, slide_content: str) -> Dict[str, Any]:
            """
            Analyze presentation content for alignment with slides, depth, and completeness.

            Args:
                transcription: Transcribed text from the presenter's speech
                slide_content: Content of the slides being presented

            Returns:
                Dict with analysis of content aspects
            """
            # Placeholder for actual implementation
            return {
                "alignment_with_slides": "high",
                "content_depth": "moderate",
                "key_points_covered": ["point 1", "point 2"],
                "missed_points": ["point 3"]
            }

        @tool
        def generate_constructive_feedback(
                delivery_analysis: Dict[str, Any],
                content_analysis: Dict[str, Any]
        ) -> Dict[str, Any]:
            """
            Generate constructive feedback based on delivery and content analysis.

            Args:
                delivery_analysis: Analysis of presentation delivery
                content_analysis: Analysis of presentation content

            Returns:
                Dict with structured feedback
            """
            # Placeholder for actual implementation
            return {
                "strengths": [
                    "Clear articulation of main concepts",
                    "Good eye contact and engagement"
                ],
                "areas_for_improvement": [
                    "Consider reducing filler words like 'um' and 'like'",
                    "Missed covering point 3 which was on the slide"
                ],
                "overall_assessment": "Strong presentation overall with minor areas for improvement"
            }

        # Initialize LLM with tools
        llm = ChatOpenAI(model=self.llm_model, temperature=0.5)
        llm_with_tools = llm.bind_tools([
            analyze_presentation_delivery,
            analyze_presentation_content,
            generate_constructive_feedback
        ])

        # Define the feedback agent
        def feedback_agent(state: Dict[str, Any]):
            # Get messages
            messages = state["messages"]

            # Generate a response using the LLM
            response = llm_with_tools.invoke(messages)

            # Return updated state
            return {"messages": messages + [response]}

        # Create a simple graph with one node
        class FeedbackState(dict):
            messages: List[Any]

        graph_builder = StateGraph(FeedbackState)
        graph_builder.add_node("feedback_agent", feedback_agent)
        graph_builder.set_entry_point("feedback_agent")

        # Compile the graph
        return graph_builder.compile()

    async def generate_presentation_feedback(
            self,
            transcription: str,
            slide_content: str,
            presenter_persona: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate feedback for a presentation

        Args:
            transcription: Transcribed text from the presenter's speech
            slide_content: Content of the slides being presented
            presenter_persona: Optional information about the presenter for contextual feedback

        Returns:
            Tuple containing feedback text and structured feedback data
        """
        # Create system prompt based on persona (educator/professor)
        system_prompt = """You are an experienced professor giving feedback on a student presentation.
        Analyze both the delivery and content of the presentation.
        Focus on being constructive and supportive while providing specific areas for improvement.
        Your feedback should be balanced, highlighting strengths while providing actionable suggestions.
        Structure your response in these sections:
        1. Strengths - What the presenter did well
        2. Areas for Improvement - Specific, actionable feedback
        3. Overall Assessment - Brief summary of the presentation quality"""

        # Add information about the presenter's persona if available
        if presenter_persona:
            persona_info = f"""The presenter is a {presenter_persona.get('year', 'college')} student 
            majoring in {presenter_persona.get('major', 'unspecified field')}.
            Tailor your feedback appropriately for this context."""
            system_prompt += "\n\n" + persona_info

        # Prepare input to the model
        human_message = f"""Please analyze this presentation:

        SLIDE CONTENT:
        {slide_content}

        PRESENTER'S TRANSCRIPTION:
        {transcription}

        Please provide detailed feedback on both the content and delivery of this presentation.
        """

        # Input messages to the graph
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_message)
        ]

        # Process with the feedback graph
        result = self.feedback_graph.invoke({"messages": messages})

        # Extract the feedback text
        feedback_text = result["messages"][-1].content

        # Parse the feedback into structured data (simplified implementation)
        feedback_structure = {
            "strengths": [],
            "areas_for_improvement": [],
            "overall_assessment": ""
        }

        # In a real implementation, you would parse the feedback text to extract
        # the structured information more intelligently

        return feedback_text, feedback_structure


class EnhancedVoiceAssistantService:
    """Enhanced service with presentation and feedback capabilities"""

    def __init__(self,
                 llm_model: str = "gpt-4-turbo",
                 feedback_model: str = "gpt-4-turbo"):
        """Initialize the service"""
        self.llm_model = llm_model
        self.feedback_service = PresentationFeedbackService(feedback_model)

        # Tracking presentation transcriptions for feedback
        self.presentation_transcriptions = {}  # session_id -> {slide_num: transcription}

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

        self.presentation_transcriptions[session_id][slide_number] = transcription

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
        Keep your presentation of this slide concise and engaging.
        Don't say "In this slide..." or use similar meta-references.
        Just present the content naturally as if speaking to your class."""

        human_prompt = f"""Here is the content of slide {slide_number}:

        {slide_content}

        Please present this slide content in your own words.
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
                "feedback": "Unable to provide feedback without presentation recording."
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
                "feedback": "Unable to provide feedback without presentation recording."
            }

        # Generate feedback using the feedback service
        feedback_text, feedback_structure = await self.feedback_service.generate_presentation_feedback(
            combined_transcription,
            combined_slide_content,
            presenter_persona
        )

        return {
            "feedback_text": feedback_text,
            "structured_feedback": feedback_structure,
            "slides_analyzed": slide_numbers
        }