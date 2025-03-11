
from pydantic import BaseModel
from typing import List, Dict, Any

class FlashcardRequest(BaseModel):
    pdf_url: str
    user_id: str
    extra_data: dict = {}

class FlashcardResponse(BaseModel):
    flashcards: List[Dict[str, Any]]
