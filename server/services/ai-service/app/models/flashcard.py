from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from bson import ObjectId
from enum import Enum
from app.models.summary import PyObjectId, ContentType

class FlashcardDifficulty(str, Enum):
    """Enum for flashcard difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class Flashcard(BaseModel):
    """
    Data model for a flashcard.
    This model is used for data validation, serialization, and deserialization.
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    document_id: PyObjectId
    front_text: str
    back_text: str
    difficulty: FlashcardDifficulty = FlashcardDifficulty.MEDIUM
    category: str = "general"
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    review_count: int = 0
    confidence_level: int = 0
    last_reviewed: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
    content_type: ContentType = ContentType.PDF  # Default to PDF for backward compatibility

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        },
        "json_schema_extra": {
            "example": {
                "_id": "60d725b8aad7be7174610e83",
                "user_id": "user123",
                "document_id": "60d725b8aad7be7174610e82",
                "front_text": "What is the capital of France?",
                "back_text": "Paris is the capital of France.",
                "difficulty": "medium",
                "category": "geography",
                "tags": ["europe", "capitals", "countries"],
                "created_at": "2023-03-10T14:30:00.000Z",
                "review_count": 5,
                "confidence_level": 4,
                "last_reviewed": "2023-03-15T10:20:00.000Z",
                "metadata": {"source_page": 12},
                "content_type": "pdf"
            }
        }
    }

class FlashcardSet(BaseModel):
    """
    Data model for a set of flashcards.
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    document_id: PyObjectId
    title: str
    description: Optional[str] = None
    flashcard_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    content_type: ContentType = ContentType.PDF  # Default to PDF for backward compatibility

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        },
        "json_schema_extra": {
            "example": {
                "_id": "60d725b8aad7be7174610e84",
                "user_id": "user123",
                "document_id": "60d725b8aad7be7174610e82",
                "title": "World Geography Flashcards",
                "description": "Flashcards about world capitals and geography",
                "flashcard_count": 25,
                "created_at": "2023-03-10T14:30:00.000Z",
                "tags": ["geography", "study", "exam-prep"],
                "content_type": "pdf"
            }
        }
    }

class FlashcardCreate(BaseModel):
    """
    Data model for creating new flashcards from content.
    This model is used for validation of input data when creating flashcards.
    """
    content_url: str
    user_id: str
    difficulty_level: str = "mixed"  # "easy", "medium", "hard", or "mixed"
    tags: List[str] = []
    focus_areas: Optional[List[str]] = None
    card_count: int = 20
    content_type: Optional[ContentType] = None  # If None, type will be auto-detected

    model_config = {
        "json_schema_extra": {
            "example": {
                "content_url": "https://example.com/document.pdf",
                "user_id": "user123",
                "difficulty_level": "mixed",
                "tags": ["physics", "study"],
                "focus_areas": ["quantum mechanics", "relativity"],
                "card_count": 20,
                "content_type": "pdf"
            }
        }
    }

class FlashcardResponse(BaseModel):
    """
    Data model for flashcard generation response.
    This model is used for standardizing API responses.
    """
    status: str
    flashcard_set_id: Optional[str] = None
    document_id: Optional[str] = None
    flashcard_count: Optional[int] = None
    sample_flashcards: Optional[List[Dict[str, str]]] = None
    error_message: Optional[str] = None
    content_type: ContentType = ContentType.PDF  # Default to PDF for backward compatibility

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "success",
                "flashcard_set_id": "60d725b8aad7be7174610e84",
                "document_id": "60d725b8aad7be7174610e82",
                "flashcard_count": 20,
                "sample_flashcards": [
                    {"front": "What is the capital of France?", "back": "Paris"},
                    {"front": "What is the largest planet in our solar system?", "back": "Jupiter"}
                ],
                "error_message": None,
                "content_type": "pdf"
            }
        }
    }

class FlashcardUpdateRequest(BaseModel):
    """
    Data model for updating a flashcard.
    """
    front_text: Optional[str] = None
    back_text: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: str

class FlashcardReviewRequest(BaseModel):
    """
    Data model for updating a flashcard's review status.
    """
    confidence_level: int  # 0-5 scale
    user_id: str