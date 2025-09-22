from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.summarize import load_summarize_chain

from langchain_openai import ChatOpenAI
from langchain_ollama.llms import OllamaLLM

from langchain.prompts import PromptTemplate
from app.utils.pdf_utils import load_pdf_from_private_url
from app.utils.db_utils import get_mongodb_client
from bson import ObjectId
import os
import datetime
from typing import List, Dict, Any, Tuple


def get_summary_by_id(summary_id: str) -> dict:
    """
    Retrieves a summary from MongoDB by its ID.

    Args:
        summary_id: The MongoDB ObjectId of the summary as a string

    Returns:
        dict: The summary document or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        summaries_collection = db["summaries"]

        summary = summaries_collection.find_one({"_id": ObjectId(summary_id)})

        if not summary:
            return {
                "status": "error",
                "message": f"Summary with ID {summary_id} not found"
            }

        # Convert ObjectId to string for JSON serialization
        summary["_id"] = str(summary["_id"])
        summary["document_id"] = str(summary["document_id"])

        return {
            "status": "success",
            "summary": summary
        }

    except Exception as e:
        error_message = f"Error retrieving summary: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def get_summaries_for_user(user_id: str, limit: int = 10) -> dict:
    """
    Retrieves all summaries for a specific user, with optional pagination.

    Args:
        user_id: The user's ID
        limit: Maximum number of summaries to return

    Returns:
        dict: List of summaries or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        summaries_collection = db["summaries"]

        # Get summaries sorted by creation date (newest first)
        cursor = summaries_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)

        summaries = []
        for summary in cursor:
            # Convert ObjectId to string for JSON serialization
            summary["_id"] = str(summary["_id"])
            summary["document_id"] = str(summary["document_id"])
            summaries.append(summary)

        return {
            "status": "success",
            "summaries": summaries,
            "count": len(summaries)
        }

    except Exception as e:
        error_message = f"Error retrieving summaries for user: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def split_into_chunks(documents: List[Any],
                      chunk_size: int = 1500,
                      chunk_overlap: int = 100) -> List[Any]:
    """
    Splits documents into smaller chunks suitable for LLM processing.

    Args:
        documents: List of document objects from load_pdf_from_url
        chunk_size: Maximum size of each chunk in characters
        chunk_overlap: Overlap between chunks in characters

    Returns:
        List of document chunks
    """
    # Initialize text splitter with appropriate parameters
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    # Split documents into chunks
    return text_splitter.split_documents(documents)


def process_document_in_chunks(documents: List[Any],
                               chain: Any,
                               user_prompt: str = None,
                               max_chunks_per_batch: int = 10,
                               chain_type: str = "map_reduce") -> str:
    """
    Processes documents in manageable batches to avoid context length issues.

    Args:
        documents: List of document chunks
        chain: LangChain chain that's already been configured with the appropriate prompts
        user_prompt: User-provided prompt to guide summarization
        max_chunks_per_batch: Maximum number of chunks to process in a single batch
        chain_type: Type of chain being used ("map_reduce" or "refine")

    Returns:
        Final summarized text
    """
    if not documents:
        return "No document content to process."

    default_prompt = "Provide a comprehensive academic summary"
    prompt_to_use = user_prompt if user_prompt else default_prompt

    # For refine chain type, process chunks sequentially
    if chain_type == "refine":
        # Start with first chunk
        current_summary = ""
        current_summary += chain.invoke({
            "input_documents": [documents[0]],
            "user_prompt": prompt_to_use
        })["output_text"]

        # Refine with subsequent chunks
        for i in range(1, len(documents)):
            current_summary += chain.invoke({
                "input_documents": [documents[i]],
                "existing_summary": current_summary,
                "user_prompt": prompt_to_use
            })["output_text"]

        return current_summary

    # If fewer chunks than max batch size, process directly
    if len(documents) <= max_chunks_per_batch:
        return chain.invoke({
            "input_documents": documents,
            "user_prompt": prompt_to_use
        })["output_text"]

    # For larger documents, process in batches
    batches = [documents[i:i + max_chunks_per_batch]
               for i in range(0, len(documents), max_chunks_per_batch)]

    # Process initial batches to get intermediate summaries
    intermediate_results = []
    for batch in batches:
        batch_summary = chain.invoke({
            "input_documents": batch,
            "user_prompt": prompt_to_use
        })["output_text"]
        intermediate_results.append(batch_summary)

    # Convert intermediate summaries back to document format for final consolidation
    from langchain.schema import Document
    intermediate_docs = [
        Document(page_content=result, metadata={"source": "intermediate_summary"})
        for result in intermediate_results
    ]

    # Create final combined summary using the same chain for consistency
    final_summary = chain.invoke({
        "input_documents": intermediate_docs,
        "user_prompt": prompt_to_use
    })["output_text"]

    return final_summary

def summarize_pdf_notes(pdf_url: str, user_id: str, prompt: str = None, summary_length: str = "medium") -> dict:
    """
    Summarizes a PDF from a URL, optionally based on a user prompt, and stores the summary in MongoDB.
    Handles large documents by processing them in chunks.

    Args:
        pdf_url: URL of the PDF document.
        user_id: Identifier for the user requesting the summary.
        prompt: (Optional) User-provided prompt to guide summarization.
        summary_length: (Optional) Desired summary length ("short", "medium", "long").
                       Defaults to "medium".

    Returns:
        dict: Dictionary containing summary, status, and any error messages.
    """
    try:
        # 1. Load PDF from URL using utility function
        documents = load_pdf_from_private_url(pdf_url)
        if not documents:
            return {
                "status": "error",
                "summary": None,
                "error_message": f"Failed to load PDF from URL: {pdf_url}. See logs for details."
            }

        # Extract document metadata
        doc_metadata = {
            "title": os.path.basename(pdf_url),
            "url": pdf_url,
            "page_count": len(documents),
            "uploaded_at": datetime.datetime.utcnow()
        }

        # 2. Initialize Language Model
        llm = ChatOpenAI(
            openai_api_key=os.environ.get("OPENAI_API_KEY"),
            model_name="gpt-4o",  # or gpt-4 for higher quality
            temperature=0.5
        )
        # llm = OllamaLLM(
        #     model ="llama3.2-vision:latest",
        # )

        # 3. Split text into chunks with our improved chunker
        chunks = split_into_chunks(documents)

        # 4. Configure the summary approach based on length and document size
        chain_type = "map_reduce" if len(chunks) > 15 else "refine"
        summary_type = "custom" if prompt else "standard"

        # 5. Set up prompts based on summary type
        # Initialize prompt templates
        if chain_type == "refine":
            # Use more detailed prompt templates for custom summaries
            refine_template = """
            Your task is to create a comprehensive summary based on the provided context and existing summary.

            EXISTING SUMMARY:
            {existing_summary}

            NEW CONTEXT:
            {text}

            Using the new context, enhance and expand upon the existing summary.
            Focus particularly on: {user_prompt}

            In your summary:
            - Maintain academic language and clarity
            - Include key concepts, arguments, and supporting evidence
            - Organize information logically
            - Ensure accuracy to the source material

            If the new context doesn't add value, return the original summary.
            """

            initial_template = """
            Create a rich, detailed summary of the following academic content based on this request: '{user_prompt}'

            CONTENT:
            {text}

            Your summary should:
            - Address the specific focus requested
            - Capture main ideas, key arguments, and supporting evidence
            - Use clear, academic language 
            - Organize information logically
            - Maintain accuracy to the source
            - Be thorough yet concise
            """

            refine_prompt = PromptTemplate.from_template(refine_template)
            initial_prompt = PromptTemplate.from_template(initial_template)

            # Set up the chain for refine approach
            chain = load_summarize_chain(
                llm,
                chain_type=chain_type,
                question_prompt=initial_prompt,
                refine_prompt=refine_prompt,
            )

        else:  # map_reduce
            map_template = """
                                Create a detailed summary of this document section focusing on: {user_prompt}
                    
                                CONTENT:
                                {text}
                    
                                Your summary should:
                                - Address the specific focus requested
                                - Capture main ideas and key arguments
                                - Use clear, academic language
                                - Be accurate and concise
                            """

            reduce_template = """
                                Synthesize these section summaries into a coherent summary that addresses: {user_prompt}
                    
                                SUMMARIES:
                                {text}
                    
                                Your final summary should:
                                - Present a unified flow of information
                                - Include all key concepts and important details
                                - Maintain academic tone and language
                                - Be thorough yet concise
                            """

            map_prompt = PromptTemplate.from_template(map_template)
            combine_prompt = PromptTemplate.from_template(reduce_template)

            # Set up the chain for map_reduce approach
            chain = load_summarize_chain(
                llm,
                chain_type=chain_type,
                map_prompt=map_prompt,
                combine_prompt=combine_prompt
            )

        # 6. Process document in chunks
        summary_output = process_document_in_chunks(
            chunks, chain, prompt, chain_type=chain_type
        )
        print(summary_output)



        # 7. Adjust Summary Length if needed
        if summary_length == "short":
            # For short summaries, ask LLM to condense
            condense_prompt = PromptTemplate.from_template(
                "Condense the following summary to approximately 300-500 words while "
                "retaining all key information and main points:\n\n{original_summary}\n\n"
                "Condensed summary:"
            )
            condensed_summary = llm.predict(condense_prompt.format(original_summary=summary_output))
            summary_output = condensed_summary

        elif summary_length == "long":
            # Long summaries can use the full output
            pass  # No modification needed

        elif summary_length == "medium" and len(summary_output.split()) > 750:
            # For medium summaries that are too long, ask LLM to condense
            condense_prompt = PromptTemplate.from_template(
                "Condense the following summary to approximately 600-750 words while "
                "retaining all key information and main points:\n\n{original_summary}\n\n"
                "Condensed summary:"
            )
            condensed_summary = llm.predict(condense_prompt.format(original_summary=summary_output))
            summary_output = condensed_summary

        # 8. Store Summary in MongoDB
        db_client = get_mongodb_client()
        db = db_client["ai_service"]

        # Store document info if not already in DB
        docs_collection = db["documents"]
        existing_doc = docs_collection.find_one({"url": pdf_url})

        if existing_doc:
            document_id = existing_doc["_id"]
        else:
            document_result = docs_collection.insert_one(doc_metadata)
            document_id = document_result.inserted_id

        # Create summary record
        summary_data = {
            "user_id": user_id,
            "document_id": document_id,
            "text": summary_output,
            "type": summary_type,
            "prompt_used": prompt,
            "length": summary_length,
            "created_at": datetime.datetime.utcnow(),
            "word_count": len(summary_output.split())
        }



        # Insert summary into MongoDB
        summaries_collection = db["summaries"]
        summary_result = summaries_collection.insert_one(summary_data)

        return {
            "status": "success",
            "summary": summary_output,
            "summary_id": str(summary_result.inserted_id),
            "document_id": str(document_id),
            "word_count": len(summary_output.split())
        }

    except Exception as e:
        error_message = f"Error during PDF summarization service: {str(e)}"
        print(error_message)  # Log error for debugging
        return {
            "status": "error",
            "summary": None,
            "error_message": error_message,
        }