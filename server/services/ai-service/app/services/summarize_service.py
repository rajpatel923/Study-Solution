from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.summarize import load_summarize_chain

from langchain_openai import ChatOpenAI

from langchain.prompts import PromptTemplate
from app.utils.content_loader import load_content, detect_content_type
from app.utils.db_utils import get_mongodb_client
from bson import ObjectId
import os
import datetime
from typing import List, Dict, Any, Tuple
from functools import lru_cache


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
                      chunk_size: int = None,
                      chunk_overlap: int = None,
                      content_type: str = "pdf") -> List[Any]:
    """
    Splits documents into smaller chunks suitable for LLM processing with content-specific optimization.

    Args:
        documents: List of document objects from content loader
        chunk_size: Maximum size of each chunk in characters (auto-optimized if None)
        chunk_overlap: Overlap between chunks in characters (auto-optimized if None)
        content_type: Type of content for optimization

    Returns:
        List of document chunks
    """
    # Optimized chunking parameters based on content type
    if chunk_size is None or chunk_overlap is None:
        chunk_configs = {
            'pdf': {'chunk_size': 2000, 'chunk_overlap': 200},
            'youtube': {'chunk_size': 3000, 'chunk_overlap': 300},  # Longer for transcripts
            'powerpoint': {'chunk_size': 1200, 'chunk_overlap': 120},  # Shorter for slides
            'image': {'chunk_size': 1500, 'chunk_overlap': 150},
            'webpage': {'chunk_size': 2000, 'chunk_overlap': 200},
            'default': {'chunk_size': 1800, 'chunk_overlap': 180}
        }
        config = chunk_configs.get(content_type, chunk_configs['default'])
        chunk_size = chunk_size or config['chunk_size']
        chunk_overlap = chunk_overlap or config['chunk_overlap']

    # Content-specific separators for better chunking
    separators_by_type = {
        'pdf': ["\n\n", "\n", ". ", " ", ""],
        'youtube': ["\n\n", ". ", "\n", " ", ""],
        'powerpoint': ["\n\n", "\n", "• ", "- ", ". ", " ", ""],
        'webpage': ["\n\n", "\n", "</p>", ". ", " ", ""],
        'image': ["\n\n", "\n", ". ", " ", ""],
        'default': ["\n\n", "\n", ". ", " ", ""]
    }
    separators = separators_by_type.get(content_type, separators_by_type['default'])

    # Initialize text splitter with optimized parameters
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators
    )

    # Split documents into chunks
    return text_splitter.split_documents(documents)


def process_document_in_chunks(documents: List[Any],
                               chain: Any,
                               user_prompt: str = None,
                               max_chunks_per_batch: int = 8,  # Reduced batch size for better performance
                               chain_type: str = "map_reduce") -> str:
    """
    Processes documents in manageable batches to avoid context length issues.
    FIXED: Corrected refine chain logic to replace instead of concatenate summaries.

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

    default_prompt = "Provide a comprehensive summary of the key points and main ideas"
    prompt_to_use = user_prompt if user_prompt else default_prompt

    # For refine chain type, process chunks sequentially
    if chain_type == "refine":
        # Start with first chunk
        current_summary = chain.invoke({
            "input_documents": [documents[0]],
            "user_prompt": prompt_to_use
        })["output_text"]

        # FIXED: Refine with subsequent chunks (replace, don't concatenate)
        for i in range(1, len(documents)):
            current_summary = chain.invoke({
                "input_documents": [documents[i]],
                "existing_summary": current_summary,
                "user_prompt": prompt_to_use
            })["output_text"]

        return current_summary

    # For small documents, process directly
    if len(documents) <= max_chunks_per_batch:
        return chain.invoke({
            "input_documents": documents,
            "user_prompt": prompt_to_use
        })["output_text"]

    # For larger documents, use improved batching strategy
    batch_size = max_chunks_per_batch
    batches = [documents[i:i + batch_size]
               for i in range(0, len(documents), batch_size)]

    # Process batches to get intermediate summaries
    intermediate_results = []
    for i, batch in enumerate(batches):
        print(f"Processing batch {i + 1}/{len(batches)} with {len(batch)} chunks")

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

    # Create final combined summary
    final_summary = chain.invoke({
        "input_documents": intermediate_docs,
        "user_prompt": prompt_to_use
    })["output_text"]

    return final_summary


@lru_cache(maxsize=20)
def get_content_specific_prompt(content_type: str, chain_type: str = "map_reduce") -> Tuple[str, str]:
    """
    Returns optimized content-specific prompt templates based on the content type.
    IMPROVED: Simplified prompts for better performance and quality.

    Args:
        content_type: The type of content ('pdf', 'youtube', etc.)
        chain_type: Type of chain being used ("map_reduce" or "refine")

    Returns:
        Tuple[str, str]: Primary and secondary prompt templates
    """

    # Optimized base prompts - shorter and more focused
    if content_type == 'youtube':
        if chain_type == "map_reduce":
            map_template = """Summarize this video transcript section focusing on: {user_prompt}

TRANSCRIPT:
{text}

Extract the main points, key insights, and actionable information. Be concise and clear."""

            reduce_template = """Combine these video section summaries into one comprehensive summary focusing on: {user_prompt}

SECTIONS:
{text}

Create a well-organized summary highlighting the main message, key insights, and important takeaways."""

            return map_template, reduce_template

        else:  # refine
            initial_template = """Create a summary of this video transcript focusing on: {user_prompt}

TRANSCRIPT:
{text}

Capture the main ideas, key points, and important insights clearly and concisely."""

            refine_template = """Improve this video summary using new transcript content.

CURRENT SUMMARY:
{existing_summary}

NEW CONTENT:
{text}

Focus on: {user_prompt}

Enhance the summary by adding important new information while maintaining clarity and flow."""

            return initial_template, refine_template

    elif content_type == 'powerpoint':
        if chain_type == "map_reduce":
            map_template = """Summarize this presentation slide focusing on: {user_prompt}

SLIDE:
{text}

Extract key points, main concepts, and important information. Maintain the logical structure."""

            reduce_template = """Combine these slide summaries into a coherent presentation overview focusing on: {user_prompt}

SLIDES:
{text}

Create a unified summary that captures the presentation's main message and key points."""

            return map_template, reduce_template

        else:  # refine
            initial_template = """Summarize this presentation slide focusing on: {user_prompt}

SLIDE:
{text}

Capture the main points and key information clearly."""

            refine_template = """Enhance this presentation summary with new slide content.

CURRENT SUMMARY:
{existing_summary}

NEW SLIDE:
{text}

Focus on: {user_prompt}

Add relevant new information while maintaining the presentation's logical flow."""

            return initial_template, refine_template

    elif content_type == 'image':
        if chain_type == "map_reduce":
            map_template = """Organize and summarize these handwritten notes focusing on: {user_prompt}

NOTES:
{text}

Structure the content clearly, connecting related concepts and clarifying key points."""

            reduce_template = """Combine these note sections into a comprehensive study guide focusing on: {user_prompt}

SECTIONS:
{text}

Create a well-organized summary that clarifies concepts and highlights important information."""

            return map_template, reduce_template

        else:  # refine
            initial_template = """Organize these handwritten notes focusing on: {user_prompt}

NOTES:
{text}

Structure the content clearly and highlight key concepts."""

            refine_template = """Improve this notes summary with additional content.

CURRENT SUMMARY:
{existing_summary}

NEW NOTES:
{text}

Focus on: {user_prompt}

Add new information while improving organization and clarity."""

            return initial_template, refine_template

    elif content_type == 'webpage':
        if chain_type == "map_reduce":
            map_template = """Summarize this webpage content focusing on: {user_prompt}

CONTENT:
{text}

Extract main ideas and key information, filtering out irrelevant details."""

            reduce_template = """Combine these webpage sections into a comprehensive summary focusing on: {user_prompt}

SECTIONS:
{text}

Create a unified overview highlighting the most important information."""

            return map_template, reduce_template

        else:  # refine
            initial_template = """Summarize this webpage content focusing on: {user_prompt}

CONTENT:
{text}

Extract the main ideas and key information clearly."""

            refine_template = """Enhance this webpage summary with additional content.

CURRENT SUMMARY:
{existing_summary}

NEW CONTENT:
{text}

Focus on: {user_prompt}

Add relevant new information while maintaining clarity and organization."""

            return initial_template, refine_template

    # Default prompts for PDFs and other documents - also optimized
    if chain_type == "map_reduce":
        map_template = """Summarize this document section focusing on: {user_prompt}

CONTENT:
{text}

Extract main concepts, key findings, and important details clearly and concisely."""

        reduce_template = """Combine these document sections into a comprehensive summary focusing on: {user_prompt}

SECTIONS:
{text}

Create a well-organized summary with key concepts, findings, and conclusions."""

        return map_template, reduce_template
    else:  # refine
        initial_template = """Create a detailed summary focusing on: {user_prompt}

CONTENT:
{text}

Capture main ideas, key arguments, and supporting evidence clearly."""

        refine_template = """Enhance this summary with new content.

CURRENT SUMMARY:
{existing_summary}

NEW CONTENT:
{text}

Focus on: {user_prompt}

Add important new information while maintaining accuracy and flow."""

        return initial_template, refine_template


def summarize_content(content_url: str, user_id: str, prompt: str = None, summary_length: str = "medium",
                      content_type: str = None) -> dict:
    """
    Summarizes content from a URL with performance optimizations and bug fixes.
    IMPROVED: Better model selection, smarter processing strategy, and length optimization.

    Args:
        content_url: URL of the content to summarize
        user_id: Identifier for the user requesting the summary
        prompt: (Optional) User-provided prompt to guide summarization
        summary_length: (Optional) Desired summary length ("short", "medium", "long")
        content_type: (Optional) Type of content. If None, will be auto-detected

    Returns:
        dict: Dictionary containing summary, status, and any error messages
    """
    try:
        # 1. Auto-detect content type if not provided
        if not content_type:
            content_type = detect_content_type(content_url)
            print(f"Auto-detected content type: {content_type}")

        # 2. Load content from URL using the appropriate loader
        documents = load_content(content_url, content_type)
        if not documents:
            return {
                "status": "error",
                "summary": None,
                "error_message": f"Failed to load content from URL: {content_url}. See logs for details."
            }

        # Extract content metadata
        doc_metadata = {
            "title": documents[0].metadata.get("title", os.path.basename(content_url)),
            "url": content_url,
            "content_type": content_type,
            "page_count": len(documents),
            "uploaded_at": datetime.datetime.utcnow()
        }

        # 3. Initialize Language Model with optimized settings
        llm = ChatOpenAI(
            openai_api_key=os.environ.get("OPENAI_API_KEY"),
            model_name="gpt-4o-mini",  # IMPROVED: Faster and more cost-effective
            temperature=0.3,  # IMPROVED: Lower temperature for more focused summaries
            max_tokens=4000,  # IMPROVED: Explicit token limit
            request_timeout=60  # IMPROVED: Timeout to prevent hanging
        )

        # 4. Split text into optimized chunks
        chunks = split_into_chunks(documents, content_type=content_type)
        print(f"Created {len(chunks)} chunks for processing")

        # 5. IMPROVED: Smarter processing strategy based on document size
        num_chunks = len(chunks)
        if num_chunks <= 5:
            chain_type = "refine"
            max_batch_size = num_chunks
        elif num_chunks <= 20:
            chain_type = "map_reduce"
            max_batch_size = 6
        else:
            chain_type = "map_reduce"
            max_batch_size = 8

        summary_type = "custom" if prompt else "standard"

        # 6. Set up optimized prompts
        primary_template, secondary_template = get_content_specific_prompt(content_type, chain_type)

        # Initialize prompt templates and chains
        if chain_type == "refine":
            initial_prompt = PromptTemplate.from_template(primary_template)
            refine_prompt = PromptTemplate.from_template(secondary_template)

            chain = load_summarize_chain(
                llm,
                chain_type=chain_type,
                question_prompt=initial_prompt,
                refine_prompt=refine_prompt,
            )
        else:  # map_reduce
            map_prompt = PromptTemplate.from_template(primary_template)
            combine_prompt = PromptTemplate.from_template(secondary_template)

            chain = load_summarize_chain(
                llm,
                chain_type=chain_type,
                map_prompt=map_prompt,
                combine_prompt=combine_prompt
            )

        # 7. Process document with improved batching
        summary_output = process_document_in_chunks(
            chunks, chain, prompt, max_chunks_per_batch=max_batch_size, chain_type=chain_type
        )

        # 8. IMPROVED: Smart length adjustment
        word_count = len(summary_output.split())
        target_ranges = {
            "short": (250, 400),
            "medium": (500, 800),
            "long": (900, 1400)
        }

        target_min, target_max = target_ranges.get(summary_length, target_ranges["medium"])

        # Only adjust if significantly outside target range (20% tolerance)
        if word_count < target_min * 0.8 or word_count > target_max * 1.2:
            adjustment_prompt = f"""Adjust this summary to {target_min}-{target_max} words while preserving all key information:

{summary_output}

Adjusted summary:"""

            try:
                summary_output = llm.predict(adjustment_prompt)
            except Exception as e:
                print(f"Length adjustment failed: {e}. Using original summary.")

        # 9. Store Summary in MongoDB
        db_client = get_mongodb_client()
        db = db_client["ai_service"]

        # Store document info if not already in DB
        docs_collection = db["documents"]
        existing_doc = docs_collection.find_one({"url": content_url})

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
            "word_count": len(summary_output.split()),
            "content_type": content_type,
            "processing_stats": {
                "chunks_created": len(chunks),
                "chain_type_used": chain_type,
                "batch_size_used": max_batch_size
            }
        }

        # Insert summary into MongoDB
        summaries_collection = db["summaries"]
        summary_result = summaries_collection.insert_one(summary_data)

        return {
            "status": "success",
            "summary": summary_output,
            "summary_id": str(summary_result.inserted_id),
            "document_id": str(document_id),
            "word_count": len(summary_output.split()),
            "content_type": content_type,
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        error_message = f"Error during content summarization service: {str(e)}"
        print(error_message)  # Log error for debugging
        return {
            "status": "error",
            "summary": None,
            "error_message": error_message,
        }