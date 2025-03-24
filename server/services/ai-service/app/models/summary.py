from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from bson import ObjectId
from enum import Enum

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

class ContentType(str, Enum):
    """Enum for supported content types"""
    PDF = "pdf"
    YOUTUBE = "youtube"
    POWERPOINT = "powerpoint"
    WEBPAGE = "webpage"
    IMAGE = "image"
    UNKNOWN = "unknown"

class Summary(BaseModel):
    """
    Data model for a document summary.
    This model is used for data validation, serialization, and deserialization.
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    document_id: PyObjectId
    text: str
    type: str = "general"  # "general" or "custom"
    prompt_used: Optional[str] = None
    length: str = "medium"  # "short", "medium", or "long"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    word_count: int = 0
    tags: List[str] = []
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
                "text": "This is a comprehensive summary of the document...",
                "type": "custom",
                "prompt_used": "Summarize the key economic factors",
                "length": "medium",
                "created_at": "2023-03-10T14:30:00.000Z",
                "word_count": 500,
                "tags": ["economics", "research", "analysis"],
                "metadata": {"source_pages": [1, 2, 3, 4]},
                "content_type": "pdf"
            }
        }
    }

class SummaryCreate(BaseModel):
    """
    Data model for creating a new summary.
    This model is used for validation of input data when creating a summary.
    """
    content_url: str
    user_id: str
    prompt: Optional[str] = None
    summary_length: str = "medium"
    tags: List[str] = []
    content_type: Optional[ContentType] = None  # If None, type will be auto-detected

    model_config = {
        "json_schema_extra": {
            "example": {
                "content_url": "https://example.com/document.pdf",
                "user_id": "user123",
                "prompt": "Summarize the key findings and methodology",
                "summary_length": "medium",
                "tags": ["research", "economics"],
                "content_type": "pdf"
            }
        }
    }

class SummaryResponse(BaseModel):
    """
    Data model for summary response.
    This model is used for standardizing API responses.
    """
    status: str
    summary_id: Optional[str] = None
    document_id: Optional[str] = None
    summary: Optional[str] = None
    word_count: Optional[int] = None
    error_message: Optional[str] = None
    content_type: ContentType = ContentType.PDF  # Default to PDF for backward compatibility

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "success",
                "summary_id": "60d725b8aad7be7174610e83",
                "document_id": "60d725b8aad7be7174610e82",
                "summary": "This is a comprehensive summary of the document...",
                "word_count": 500,
                "error_message": None,
                "content_type": "pdf"
            }
        }
    }