
from pydantic import BaseModel

class TestNoteRequest(BaseModel):
    pdf_url: str
    user_id: str
    extra_data: dict = {}

class TestNoteResponse(BaseModel):
    title: str
    content: str
