from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime


class Message(BaseModel):
    """Model for conversation messages"""
    id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime


class ConversationState(BaseModel):
    """Model for tracking conversation state"""
    session_id: str
    messages: List[Message]
    last_updated: datetime


class AudioTranscriptionRequest(BaseModel):
    """Model for audio transcription requests"""
    session_id: str


class TextToSpeechRequest(BaseModel):
    """Model for text-to-speech requests"""
    session_id: str
    text: str
    voice_id: Optional[str] = "21m00Tcm4TlvDq8ikWAM"  # Default ElevenLabs voice


class TextResponse(BaseModel):
    """Model for text responses"""
    session_id: str
    text: str
    role: str


class ControlMessage(BaseModel):
    """Model for control messages"""
    session_id: str
    action: str  # 'start', 'stop', 'pause', 'resume'
    target: str  # 'recording', 'playback', 'processing'


class WebSocketMessage(BaseModel):
    """Base model for WebSocket messages"""
    type: str  # 'text', 'control', 'audio' (audio is handled separately as binary)
    session_id: str
    data: Union[Dict[str, Any], str]