from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from bson import ObjectId


class PyObjectId(str):
    """Custom ObjectId class for Pydantic v2 models"""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(ObjectId(v))

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate)
            ])
        ])


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
    difficulty: str = "medium"  # "easy", "medium", or "hard"
    tags: List[str] = []
    category: str = "general"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_reviewed: Optional[datetime] = None
    review_count: int = 0
    confidence_level: int = 0  # 0-5 scale, 0 being lowest confidence
    metadata: Dict[str, Any] = {}

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
                "front_text": "What is the central dogma of molecular biology?",
                "back_text": "The central dogma states that DNA is transcribed to RNA, which is translated to proteins.",
                "difficulty": "medium",
                "tags": ["biology", "molecular", "genetics"],
                "category": "definitions",
                "created_at": "2023-03-10T14:30:00.000Z",
                "last_reviewed": "2023-03-15T09:45:00.000Z",
                "review_count": 3,
                "confidence_level": 4,
                "metadata": {"page_number": 42, "section": "Chapter 3"}
            }
        }
    }


class FlashcardCreate(BaseModel):
    """
    Data model for creating flashcards from a PDF.
    This model is used for validation of input data when creating flashcards.
    """
    pdf_url: str
    user_id: str
    difficulty_level: str = "mixed"  # "easy", "medium", "hard", or "mixed"
    tag_categories: Optional[List[str]] = None
    focus_areas: Optional[List[str]] = None  # Areas to focus on when generating flashcards
    card_count: int = 20  # Target number of flashcards to generate
    include_images: bool = False  # Whether to include images in flashcards

    model_config = {
        "json_schema_extra": {
            "example": {
                "pdf_url": "https://example.com/document.pdf",
                "user_id": "user123",
                "difficulty_level": "mixed",
                "tag_categories": ["definitions", "concepts", "applications"],
                "focus_areas": ["key definitions", "main theories", "practical applications"],
                "card_count": 20,
                "include_images": False
            }
        }
    }


class FlashcardSet(BaseModel):
    """
    Data model for a set of flashcards created from a document.
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    document_id: PyObjectId
    title: str
    description: Optional[str] = None
    flashcard_count: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
    }


class FlashcardResponse(BaseModel):
    """
    Data model for flashcard creation response.
    This model is used for standardizing API responses.
    """
    status: str
    flashcard_set_id: Optional[str] = None
    document_id: Optional[str] = None
    flashcard_count: Optional[int] = None
    sample_flashcards: Optional[List[Dict[str, str]]] = None
    error_message: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "success",
                "flashcard_set_id": "60d725b8aad7be7174610e83",
                "document_id": "60d725b8aad7be7174610e82",
                "flashcard_count": 20,
                "sample_flashcards": [
                    {
                        "front": "What is the central dogma of molecular biology?",
                        "back": "The central dogma states that DNA is transcribed to RNA, which is translated to proteins."
                    }
                ],
                "error_message": None
            }
        }
    }