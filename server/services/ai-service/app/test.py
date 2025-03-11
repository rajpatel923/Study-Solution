from app.services.summarize_pdf_service import summarize_pdf_notes


def test_summarize_pdf():
    # Provide a PDF URL (this should be accessible and valid)
    pdf_url = "https://raw.githubusercontent.com/lijlansg/TrafficGPT/main/asset/TrafficGPT.pdf"
    # Example user id (ensure this is valid for your application)
    user_id = "example_user_id"
    # Provide a prompt to guide the summarization (adjust as needed)
    prompt = "Summarize the key findings and methodology"
    # Define the desired summary length (e.g., "short", "medium", "long")
    summary_length = "medium"

    # Call the summarization function
    summary_result = summarize_pdf_notes(
        pdf_url=pdf_url,
        user_id=user_id,
        prompt=prompt,
        summary_length=summary_length
    )

    # Print out the result
    print("Summary result:", summary_result)
if __name__ == "__main__":
    test_summarize_pdf()