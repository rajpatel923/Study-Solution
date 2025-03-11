from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.utils.pdf_utils import load_pdf_from_url

def generate_flashcards_from_pdf(pdf_url: str, user_id: str, extra_data: dict) -> dict:
    # Download and extract text from PDF
    pdf_content = load_pdf_from_url(pdf_url)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  # Increased for better context
        chunk_overlap=300,  # Increased for better continuity
        separators=["\n\n", "\n", " ", ""]  # Better paragraph handling
    )
    texts = text_splitter.split_documents(pdf_content)

    # Integrate your flashcard generation logic here (e.g., NLP parsing with Langchain)
    flashcards = {
        "flashcards": [
            {"question": "What is ...?", "answer": "Answer 1"},
            {"question": "Explain ...", "answer": "Answer 2"}
        ]
    }
    # Optionally, save flashcards to a user-specific store
    return flashcards
