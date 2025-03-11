
from fastapi import APIRouter, HTTPException
from app.models.flashcard import FlashcardRequest, FlashcardResponse
from app.services.flashcard_service import generate_flashcards_from_pdf

router = APIRouter()

@router.post("/flashcards", response_model=FlashcardResponse)
async def flashcards(request: FlashcardRequest):
    try:
        flashcards_data = generate_flashcards_from_pdf(request.pdf_url, request.user_id, request.extra_data)
        return flashcards_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
