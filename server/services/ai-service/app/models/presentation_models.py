from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime


class SlideContent(BaseModel):
    """Model for slide content"""
    slide_number: int
    content: str


class PresenterRange(BaseModel):
    """Model for presenter range"""
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


class PresentationSetup(BaseModel):
    """Model for presentation setup"""
    session_id: str
    slide_contents: List[SlideContent]
    presenter_ranges: List[PresenterRange]
    presentation_title: Optional[str] = ""
    presentation_topic: Optional[str] = ""
    student_persona: Optional[StudentPersona] = None


class SlideAdvance(BaseModel):
    """Model for slide advancement"""
    session_id: str


class PresentationControl(BaseModel):
    """Model for presentation control messages"""
    session_id: str
    action: str  # 'advance_slide', 'present_slide', 'end_presentation'
    slide: Optional[int] = None


class PresentationState(BaseModel):
    """Model for presentation state response"""
    current_slide: int
    total_slides: int
    current_presenter: str
    presentation_active: bool
    presentation_title: Optional[str] = ""
    presentation_topic: Optional[str] = ""
    student_persona: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PresentationUpdate(BaseModel):
    """Model for presentation update messages"""
    type: str = "presentation_update"
    data: Dict[str, Any]
    session_id: str