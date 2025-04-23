import logging
from fastapi import APIRouter, HTTPException, Body, Query, BackgroundTasks
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel
from datetime import datetime
import asyncio

from app.utils.powerpoint_utils import process_powerpoint_from_url, SlideExtract, PresentationExtract
from app.services.voice_assistant_service import voice_assistant_service
from app.config import get_settings
from app.utils.websocket_manager import websocket_manager

# Initialize router
router = APIRouter(
    prefix="/presentation",
    tags=["presentation"],
    responses={404: {"description": "Not found"}},
)

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

# Session storage for debugging
session_storage = {}


# Input models
class PresentationProcessRequest(BaseModel):
    """Request model for processing PowerPoint files"""
    presentation_url: str  # Azure Blob Storage URL
    session_id: str


class PresentationSlideRange(BaseModel):
    """Model for presenter slide range"""
    start: int
    end: int


class StudentPersona(BaseModel):
    """Model for student persona configuration"""
    name: Optional[str] = "Alex"
    age: Optional[int] = 20
    year: Optional[str] = "Sophomore"
    major: Optional[str] = "Computer Science"
    tone: Optional[str] = "enthusiastic but informative"
    speaking_style: Optional[str] = "conversational with occasional academic terminology"


class PresentationSetupRequest(BaseModel):
    """Request model for setting up a presentation"""
    session_id: str
    presenter_ranges: List[PresentationSlideRange]
    presentation_title: Optional[str] = None
    presentation_topic: Optional[str] = None
    student_persona: Optional[Dict[str, Any]] = None


# Response models
class ProcessedPresentationResponse(BaseModel):
    """Response model for processed presentation"""
    title: str
    total_slides: int
    slides: List[Dict[str, Any]]

# Helper function for background processing
async def process_presentation_in_background(session_id: str, presentation_url: str):
    """Process a presentation in the background to avoid blocking"""
    try:
        # Process the PowerPoint from Azure Blob Storage URL
        logger.info(f"Processing PowerPoint from URL: {presentation_url}")
        presentation_extract = await process_powerpoint_from_url(presentation_url)

        # Convert to response format
        slides_data = []
        for slide in presentation_extract.slides:
            slides_data.append({
                "slide_number": slide.slide_number,
                "title": slide.title,
                "content": slide.content,
                "notes": slide.notes
            })

        # Store processed slides in session storage
        session_storage[session_id] = {
            "title": presentation_extract.title,
            "total_slides": presentation_extract.total_slides,
            "slides": slides_data,
            "processed": True,
            "processing": False
        }

        # Notify client that processing is complete (if websocket connected)
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "processing_status",
                "data": {
                    "status": "complete",
                    "message": "Presentation processing complete"
                }
            })

    except Exception as e:
        logger.error(f"Error in background presentation processing for {session_id}: {str(e)}")
        session_storage[session_id] = {
            "processing": False,
            "error": str(e)
        }

        # Notify client of error (if websocket connected)
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error processing presentation: {str(e)}"
                }
            })


@router.post("/process", response_model=ProcessedPresentationResponse)
async def process_presentation(
        request: PresentationProcessRequest = Body(...),
        background_tasks: BackgroundTasks = None
):
    """
    Process a PowerPoint file from Azure Blob Storage URL and extract its content

    Args:
        request (PresentationProcessRequest): Request body with presentation URL
        background_tasks: BackgroundTasks for running background processing

    Returns:
        ProcessedPresentationResponse: Structured presentation content
    """
    try:
        # Store session ID and mark as processing
        session_storage[request.session_id] = {
            "processing": True,
            "timestamp": datetime.now().isoformat()
        }

        # Start background processing task if BackgroundTasks is available
        if background_tasks:
            background_tasks.add_task(
                process_presentation_in_background,
                request.session_id,
                request.presentation_url
            )
        else:
            # If BackgroundTasks is not available, create a task directly
            asyncio.create_task(process_presentation_in_background(
                request.session_id,
                request.presentation_url
            ))

        # Notify client that processing has started (if websocket connected)
        if websocket_manager.is_connected(request.session_id):
            asyncio.create_task(websocket_manager.send_json(request.session_id, {
                "type": "processing_status",
                "data": {
                    "status": "started",
                    "message": "Processing presentation..."
                }
            }))

        # For synchronous API, we'll process enough to return a response
        # This performs a minimal initial processing for immediate response
        presentation_extract = await process_powerpoint_from_url(request.presentation_url)

        # Create a minimal initial response
        initial_slides = []
        if presentation_extract.slides and len(presentation_extract.slides) > 0:
            # Just use the first slide for the initial response
            initial_slides = [{
                "slide_number": presentation_extract.slides[0].slide_number,
                "title": presentation_extract.slides[0].title,
                "content": "Processing...",
                "notes": "Processing..."
            }]

        return {
            "title": presentation_extract.title,
            "total_slides": presentation_extract.total_slides,
            "slides": initial_slides
        }

    except Exception as e:
        logger.error(f"Error initiating presentation processing: {str(e)}")
        # Update session storage with error
        if request.session_id in session_storage:
            session_storage[request.session_id]["error"] = str(e)
            session_storage[request.session_id]["processing"] = False

        raise HTTPException(status_code=500, detail=f"Error processing presentation: {str(e)}")


async def process_presentation_turn(
        self,
        session_id: str,
        slide_number: int
) -> Tuple[str, bytes]:
    """
    Process a turn in the presentation

    Args:
        session_id: Session identifier
        slide_number: Current slide number

    Returns:
        Tuple[str, bytes]: Assistant's text response and audio response
    """
    # This is a wrapper that calls the enhanced version
    return await self.process_presentation_turn_enhanced(session_id, slide_number)
# Helper function for presentation setup
# In voice_assistant.py, modify the setup_presentation_background function:
async def setup_presentation_background(
        session_id: str,
        presenter_ranges: List[PresentationSlideRange],
        presentation_title: Optional[str],
        presentation_topic: Optional[str],
        student_persona: Optional[Dict[str, Any]]
):
    try:
        # Get the processed slides from session storage
        if session_id not in session_storage or not session_storage[session_id].get("processed"):
            logger.error(f"Session {session_id} not found in storage or not processed")
            if websocket_manager.is_connected(session_id):
                await websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Presentation not found or not processed"
                    }
                })
            return

        session_data = session_storage[session_id]

        # Convert slide_contents to the dictionary format expected by the voice assistant service
        slide_contents = {}
        for slide in session_data["slides"]:
            content = f"{slide.get('title', '')}\n\n{slide.get('content', '')}"
            if slide.get('notes'):
                content += f"\n\nNotes: {slide['notes']}"
            slide_contents[slide["slide_number"]] = content

        # Convert presenter_ranges to the format expected by the voice assistant service
        presenter_ranges_tuples = []
        for range_obj in presenter_ranges:
            presenter_ranges_tuples.append((range_obj.start, range_obj.end))

        # Add debug logging
        logger.info(f"Setting up presentation for session {session_id}")
        logger.info(f"Slide contents: {list(slide_contents.keys())}")
        logger.info(f"Presenter ranges: {presenter_ranges_tuples}")
        logger.info(f"Title: {presentation_title or session_data['title']}")
        logger.info(f"Student persona: {student_persona}")

        # Notify client that setup is starting
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "processing_status",
                "data": {
                    "status": "setting_up",
                    "message": "Setting up presentation..."
                }
            })

        # Setup the presentation using the voice assistant service
        # Run in a separate thread to avoid blocking
        success = await asyncio.to_thread(
            voice_assistant_service.setup_presentation,
            session_id=session_id,
            slide_contents=slide_contents,  # Using dictionary format
            presenter_ranges=presenter_ranges_tuples,
            presentation_title=presentation_title or session_data["title"],
            presentation_topic=presentation_topic or session_data["title"],
            student_persona=student_persona
        )

        # Additional logging for success/failure
        if success:
            logger.info(f"Successfully set up presentation for session {session_id}")
        else:
            logger.error(f"Failed to setup presentation for session {session_id}")

        # Rest of the function remains the same...

        if not success:
            logger.error(f"Failed to setup presentation for session {session_id}")
            if websocket_manager.is_connected(session_id):
                await websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Failed to setup presentation"
                    }
                })
            return

        # Get initial presentation state
        state = voice_assistant_service.get_presentation_state(session_id)

        # Store setup info in session storage
        session_storage[session_id]["setup"] = True
        session_storage[session_id]["state"] = state

        # Notify client that setup is complete
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "presentation_update",
                "data": {
                    "status": "setup_complete",
                    "message": "Presentation setup complete",
                    "presentation_state": state
                }
            })

    except Exception as e:
        logger.error(f"Error in background presentation setup for {session_id}: {str(e)}")
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error setting up presentation: {str(e)}"
                }
            })




@router.post("/setup", response_model=Dict[str, Any])
async def setup_presentation(
        request: PresentationSetupRequest = Body(...),
        background_tasks: BackgroundTasks = None
):
    """
    Set up a presentation for co-presenting

    Args:
        request (PresentationSetupRequest): Setup request with presenter ranges
        background_tasks: BackgroundTasks for running background processing

    Returns:
        Dict[str, Any]: Setup status and initial presentation state
    """
    try:
        # Verify the session exists and has processed slides
        if request.session_id not in session_storage:
            raise HTTPException(status_code=404, detail="Session not found")

        if not session_storage[request.session_id].get("processed"):
            # Check if it's still processing
            if session_storage[request.session_id].get("processing"):
                return {
                    "status": "processing",
                    "message": "Presentation is still being processed. Please try again in a moment."
                }
            else:
                raise HTTPException(status_code=400, detail="Presentation not processed")

        # Start setup task - either as background task or as async task
        if background_tasks:
            background_tasks.add_task(
                setup_presentation_background,
                request.session_id,
                request.presenter_ranges,
                request.presentation_title,
                request.presentation_topic,
                request.student_persona
            )
        else:
            # If BackgroundTasks is not available, create a task directly
            asyncio.create_task(setup_presentation_background(
                request.session_id,
                request.presenter_ranges,
                request.presentation_title,
                request.presentation_topic,
                request.student_persona
            ))

        # Return immediate response
        return {
            "status": "processing",
            "message": "Presentation setup started in background"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting presentation setup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error setting up presentation: {str(e)}")




@router.get("/state", response_model=Dict[str, Any])
async def get_presentation_state(
        session_id: str = Query(..., description="Session identifier")
):
    """
    Get the current state of a presentation

    Args:
        session_id (str): Session identifier

    Returns:
        Dict[str, Any]: Current presentation state
    """
    try:
        # For debugging
        logger.info(f"Getting state for session {session_id}")
        logger.info(f"Available sessions: {list(session_storage.keys())}")
        if session_id in session_storage:
            # Don't log entire session data as it might be large
            logger.info(
                f"Session {session_id} status: processed={session_storage[session_id].get('processed')}, setup={session_storage[session_id].get('setup')}")

        # Try to get state from voice assistant service - run in a separate thread to avoid blocking
        state = await asyncio.to_thread(voice_assistant_service.get_presentation_state, session_id)

        # If error is returned, check session storage for debugging
        if "error" in state:
            if session_id in session_storage:
                logger.error(f"Session {session_id} found in storage but not in voice assistant service")
                if session_storage[session_id].get("setup"):
                    logger.error(f"Session {session_id} was set up but state not found in voice assistant service")
                else:
                    logger.error(f"Session {session_id} was not properly set up")
            else:
                logger.error(f"Session {session_id} not found in session storage")

            raise HTTPException(status_code=404, detail=state["error"])

        return {
            "status": "success",
            "presentation_state": state
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting presentation state: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting presentation state: {str(e)}")


@router.post("/advance", response_model=Dict[str, Any])
async def advance_presentation_slide(
        session_id: str = Query(..., description="Session identifier")
):
    """
    Advance to the next slide in the presentation

    Args:
        session_id (str): Session identifier

    Returns:
        Dict[str, Any]: Updated slide information
    """
    try:
        # Non-blocking call to advance slide
        slide_info = await asyncio.to_thread(voice_assistant_service.advance_slide, session_id)

        if "error" in slide_info:
            raise HTTPException(status_code=400, detail=slide_info["error"])

        # Notify other clients via WebSocket if connected
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "presentation_update",
                "data": {
                    "current_slide": slide_info["slide_number"],
                    "current_presenter": slide_info["presenter"],
                    "total_slides": slide_info["total_slides"]
                }
            })

        return {
            "status": "success",
            "slide_info": slide_info
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error advancing slide: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error advancing slide: {str(e)}")


@router.post("/end", response_model=Dict[str, Any])
async def end_presentation(
        session_id: str = Query(..., description="Session identifier")
):
    """
    End a presentation session

    Args:
        session_id (str): Session identifier

    Returns:
        Dict[str, Any]: End status
    """
    try:
        # End presentation in a non-blocking way
        success = await asyncio.to_thread(voice_assistant_service.end_presentation, session_id)

        if not success:
            raise HTTPException(status_code=404, detail="Presentation not found")

        # Notify clients via WebSocket if connected
        if websocket_manager.is_connected(session_id):
            await websocket_manager.send_json(session_id, {
                "type": "presentation_update",
                "data": {
                    "presentation_active": False,
                    "message": "Presentation ended"
                }
            })

        return {
            "status": "success",
            "message": "Presentation ended"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending presentation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ending presentation: {str(e)}")


@router.post("/init", response_model=Dict[str, Any])
async def initialize_session(
        request: Dict[str, Any] = Body(...)
):
    """
    Initialize a new presentation session with minimal data

    Args:
        request (Dict[str, Any]): Request with session_id

    Returns:
        Dict[str, Any]: Session initialization status
    """
    try:
        session_id = request.get("session_id")
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")

        # Just initialize basic session data
        session_storage[session_id] = {
            "initialized": True,
            "timestamp": datetime.now().isoformat()
        }

        # Initialize session in voice assistant service - run in a non-blocking way
        if not hasattr(voice_assistant_service, 'session_data'):
            voice_assistant_service.session_data = {}

        voice_assistant_service.session_data[session_id] = {
            "messages": []
        }

        return {
            "status": "success",
            "message": "Session initialized",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error initializing session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error initializing session: {str(e)}")