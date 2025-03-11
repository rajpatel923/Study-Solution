from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.utils.pdf_utils import load_pdf_from_url
def create_test_note_from_pdf(pdf_url: str, user_id: str, extra_data: dict) -> dict:
    # Download and extract text from PDF
    pdf_content = load_pdf_from_url(pdf_url)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  # Increased for better context
        chunk_overlap=300,  # Increased for better continuity
        separators=["\n\n", "\n", " ", ""]  # Better paragraph handling
    )
    text = text_splitter.split_documents(pdf_content)

    # Process text to generate a test note (using your AI logic)
    test_note = {
        "title": f"Test Note for {user_id}",
        "content": text[:300] + "..."  # Example snippet from the PDF
    }
    # Optionally, persist the test note for later retrieval.
    return test_note
