
from fastapi import APIRouter, HTTPException
from app.models.test_note import TestNoteRequest, TestNoteResponse
from app.services.test_note_service import create_test_note_from_pdf

router = APIRouter()

@router.post("/test-note", response_model=TestNoteResponse)
async def create_test_note(request: TestNoteRequest):
    try:
        note = create_test_note_from_pdf(request.pdf_url, request.user_id, request.extra_data)
        return note
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
