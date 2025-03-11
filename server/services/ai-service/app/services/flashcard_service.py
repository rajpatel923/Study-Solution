from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain_ollama.llms import OllamaLLM
from langchain.prompts import PromptTemplate
from app.utils.pdf_utils import load_pdf_from_url
from app.utils.db_utils import get_mongodb_client
from bson import ObjectId
import os
import datetime
import json
import re
from typing import List, Dict, Any, Optional


def get_flashcard_by_id(flashcard_id: str) -> dict:
    """
    Retrieves a flashcard from MongoDB by its ID.

    Args:
        flashcard_id: The MongoDB ObjectId of the flashcard as a string

    Returns:
        dict: The flashcard document or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        flashcards_collection = db["flashcards"]

        flashcard = flashcards_collection.find_one({"_id": ObjectId(flashcard_id)})

        if not flashcard:
            return {
                "status": "error",
                "message": f"Flashcard with ID {flashcard_id} not found"
            }

        # Convert ObjectId to string for JSON serialization
        flashcard["_id"] = str(flashcard["_id"])
        flashcard["document_id"] = str(flashcard["document_id"])

        return {
            "status": "success",
            "flashcard": flashcard
        }

    except Exception as e:
        error_message = f"Error retrieving flashcard: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def get_flashcards_for_user(user_id: str, limit: int = 50, filters: dict = None) -> dict:
    """
    Retrieves flashcards for a specific user, with optional filters and pagination.

    Args:
        user_id: The user's ID
        limit: Maximum number of flashcards to return
        filters: Additional query filters to apply

    Returns:
        dict: List of flashcards or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        flashcards_collection = db["flashcards"]

        # Start with base query for user
        query = {"user_id": user_id}

        # Add any additional filters
        if filters:
            query.update(filters)

        # Get flashcards sorted by creation date (newest first)
        cursor = flashcards_collection.find(query).sort("created_at", -1).limit(limit)

        flashcards = []
        for flashcard in cursor:
            # Convert ObjectId to string for JSON serialization
            flashcard["_id"] = str(flashcard["_id"])
            flashcard["document_id"] = str(flashcard["document_id"])

            # Convert datetime objects to ISO format
            if flashcard.get("created_at"):
                flashcard["created_at"] = flashcard["created_at"].isoformat()
            if flashcard.get("last_reviewed"):
                flashcard["last_reviewed"] = flashcard["last_reviewed"].isoformat()

            flashcards.append(flashcard)

        return {
            "status": "success",
            "flashcards": flashcards,
            "count": len(flashcards)
        }

    except Exception as e:
        error_message = f"Error retrieving flashcards for user: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def get_flashcards_by_document(document_id: str, user_id: str) -> dict:
    """
    Retrieves all flashcards associated with a specific document for a user.

    Args:
        document_id: The document ID
        user_id: The user's ID

    Returns:
        dict: The flashcard set and all associated flashcards
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]

        # First get the flashcard set info
        sets_collection = db["flashcard_sets"]
        flashcard_set = sets_collection.find_one({
            "document_id": ObjectId(document_id),
            "user_id": user_id
        })

        if not flashcard_set:
            return {
                "status": "error",
                "message": f"Flashcard set for document {document_id} not found"
            }

        # Convert ObjectIds to strings
        flashcard_set["_id"] = str(flashcard_set["_id"])
        flashcard_set["document_id"] = str(flashcard_set["document_id"])
        if flashcard_set.get("created_at"):
            flashcard_set["created_at"] = flashcard_set["created_at"].isoformat()

        # Get all flashcards for this document and user
        flashcards_collection = db["flashcards"]
        cursor = flashcards_collection.find({
            "document_id": ObjectId(document_id),
            "user_id": user_id
        }).sort("created_at", -1)

        flashcards = []
        for flashcard in cursor:
            # Convert ObjectId to string for JSON serialization
            flashcard["_id"] = str(flashcard["_id"])
            flashcard["document_id"] = str(flashcard["document_id"])

            # Convert datetime objects to ISO format
            if flashcard.get("created_at"):
                flashcard["created_at"] = flashcard["created_at"].isoformat()
            if flashcard.get("last_reviewed"):
                flashcard["last_reviewed"] = flashcard["last_reviewed"].isoformat()

            flashcards.append(flashcard)

        return {
            "status": "success",
            "flashcard_set": flashcard_set,
            "flashcards": flashcards,
            "count": len(flashcards)
        }

    except Exception as e:
        error_message = f"Error retrieving flashcards for document: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def update_flashcard_review_status(flashcard_id: str, confidence_level: int) -> dict:
    """
    Updates a flashcard's review status after the user has reviewed it.

    Args:
        flashcard_id: The flashcard ID
        confidence_level: The user's confidence level (0-5)

    Returns:
        dict: Success or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        flashcards_collection = db["flashcards"]

        # Update the flashcard
        now = datetime.datetime.utcnow()
        result = flashcards_collection.update_one(
            {"_id": ObjectId(flashcard_id)},
            {
                "$set": {
                    "last_reviewed": now,
                    "confidence_level": confidence_level
                },
                "$inc": {
                    "review_count": 1
                }
            }
        )

        if result.modified_count == 0:
            return {
                "status": "error",
                "message": f"Flashcard {flashcard_id} not found or not modified"
            }

        return {
            "status": "success",
            "message": f"Flashcard {flashcard_id} review status updated",
            "last_reviewed": now.isoformat(),
            "confidence_level": confidence_level
        }

    except Exception as e:
        error_message = f"Error updating flashcard review status: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def delete_flashcard(flashcard_id: str) -> dict:
    """
    Deletes a flashcard by its ID.

    Args:
        flashcard_id: The flashcard ID

    Returns:
        dict: Success or error information
    """
    try:
        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        flashcards_collection = db["flashcards"]

        result = flashcards_collection.delete_one({"_id": ObjectId(flashcard_id)})

        if result.deleted_count == 0:
            return {
                "status": "error",
                "message": f"Flashcard {flashcard_id} not found or not deleted"
            }

        return {
            "status": "success",
            "message": f"Flashcard {flashcard_id} successfully deleted"
        }

    except Exception as e:
        error_message = f"Error deleting flashcard: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def split_into_chunks(documents: List[Any],
                      chunk_size: int = 1500,
                      chunk_overlap: int = 200) -> List[Any]:
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


def extract_json_from_llm_response(response: str) -> List[Dict]:
    """
    Extracts JSON data from LLM response text, handling possible formatting issues.

    Args:
        response: The raw response from the LLM

    Returns:
        List of dictionaries containing flashcard data
    """
    # Try to find JSON array in the response
    json_pattern = r'\[\s*\{.*\}\s*\]'
    json_match = re.search(json_pattern, response, re.DOTALL)

    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    # If not found or invalid, look for individual JSON objects
    json_objects = []
    object_pattern = r'\{\s*"front".*?"back".*?\}'
    matches = re.finditer(object_pattern, response, re.DOTALL)

    for match in matches:
        try:
            obj = json.loads(match.group(0))
            json_objects.append(obj)
        except json.JSONDecodeError:
            continue

    # If we found objects individually, return them
    if json_objects:
        return json_objects

    # Last resort: try to manually parse key-value pairs
    flashcards = []
    sections = response.split('\n\n')
    current_card = {}

    for section in sections:
        if 'front:' in section.lower() or 'front text:' in section.lower():
            # Start a new card
            if current_card and 'front' in current_card and 'back' in current_card:
                flashcards.append(current_card)
            current_card = {}

            lines = section.split('\n')
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower()
                    value = value.strip()

                    if 'front' in key:
                        current_card['front'] = value
                    elif 'back' in key:
                        current_card['back'] = value
                    elif 'difficulty' in key:
                        current_card['difficulty'] = value
                    elif 'category' in key or 'tag' in key:
                        current_card['category'] = value

    # Add the last card if it exists
    if current_card and 'front' in current_card and 'back' in current_card:
        flashcards.append(current_card)

    return flashcards


def generate_flashcards_from_chunk(chunk: Any,
                                   llm: Any,
                                   difficulty_level: str = "mixed",
                                   focus_areas: List[str] = None,
                                   target_count: int = 5) -> List[Dict]:
    """
    Generates flashcards from a document chunk using an LLM.

    Args:
        chunk: A document chunk
        llm: Language model
        difficulty_level: Desired difficulty level
        focus_areas: List of areas to focus on
        target_count: Number of flashcards to generate from this chunk

    Returns:
        List of dictionaries with flashcard data
    """
    # Create the prompt template for flashcard generation
    difficulty_instruction = ""
    if difficulty_level == "easy":
        difficulty_instruction = "Create easy flashcards focusing on basic concepts and definitions."
    elif difficulty_level == "medium":
        difficulty_instruction = "Create medium difficulty flashcards that include applying concepts."
    elif difficulty_level == "hard":
        difficulty_instruction = "Create challenging flashcards requiring deeper understanding and application."
    elif difficulty_level == "mixed":
        difficulty_instruction = "Create a mix of easy, medium, and hard flashcards."

    focus_instruction = ""
    if focus_areas and len(focus_areas) > 0:
        focus_instruction = f"Focus on these areas: {', '.join(focus_areas)}."

    prompt_template = """
    You are an expert educator creating high-quality flashcards for students. 
    Create {target_count} flashcards from the following text content.

    {difficulty_instruction}
    {focus_instruction}

    For each flashcard:
    1. The front should contain a clear, concise question
    2. The back should contain a comprehensive answer
    3. Assign a difficulty level ("easy", "medium", "hard")
    4. Assign a category/tag that describes the flashcard content

    Return the flashcards in this JSON format:
    [
      {{
        "front": "Question on front of card",
        "back": "Answer on back of card",
        "difficulty": "medium",
        "category": "topic"
      }},
      ...
    ]

    TEXT CONTENT:
    {text}

    FLASHCARDS (JSON format):
    """

    prompt = PromptTemplate(
        input_variables=["text", "difficulty_instruction", "focus_instruction", "target_count"],
        template=prompt_template
    )

    # Create and run the LLM chain
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.run(
        text=chunk.page_content,
        difficulty_instruction=difficulty_instruction,
        focus_instruction=focus_instruction,
        target_count=target_count
    )

    # Extract and parse the flashcards from the response
    try:
        flashcards = extract_json_from_llm_response(response)

        # Add metadata from the chunk
        for card in flashcards:
            if not isinstance(card, dict):
                continue

            # Get page number from metadata if available
            page_number = chunk.metadata.get("page_num")
            if page_number:
                if not card.get("metadata"):
                    card["metadata"] = {}
                card["metadata"]["page_number"] = page_number

        return flashcards
    except Exception as e:
        print(f"Error parsing flashcards: {str(e)}")
        return []


def create_flashcards_from_pdf(
        pdf_url: str,
        user_id: str,
        difficulty_level: str = "mixed",
        tag_categories: List[str] = None,
        focus_areas: List[str] = None,
        card_count: int = 20,
        include_images: bool = False
) -> dict:
    """
    Generates flashcards from a PDF document, optimized for effective learning.

    Args:
        pdf_url: URL of the PDF document
        user_id: Identifier for the user requesting the flashcards
        difficulty_level: Desired difficulty level ("easy", "medium", "hard", or "mixed")
        tag_categories: Optional list of categories to organize flashcards
        focus_areas: Optional list of topics to focus on when generating flashcards
        card_count: Target number of flashcards to generate
        include_images: Whether to include images in flashcards (currently not supported)

    Returns:
        dict: Dictionary containing flashcard data, status, and any error messages
    """
    try:
        # 1. Load PDF from URL using utility function
        documents = load_pdf_from_url(pdf_url)
        if not documents:
            return {
                "status": "error",
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
        # Change model based on availability
        # try:
        #     llm = ChatOpenAI(
        #         openai_api_key=os.environ.get("OPENAI_API_KEY"),
        #         model_name="gpt-4o",  # or gpt-4 for higher quality
        #         temperature=0.5
        #     )
        # except:
            # Fallback to local model if OpenAI is not available
        llm = OllamaLLM(
            model="llama3.2-vision:latest",
        )

        # 3. Split text into manageable chunks
        chunks = split_into_chunks(documents, chunk_size=2000, chunk_overlap=200)

        # 4. Calculate cards per chunk based on document size
        chunk_count = len(chunks)
        if chunk_count == 0:
            return {
                "status": "error",
                "error_message": "No content found in the PDF"
            }

        # Distribute cards per chunk, with a minimum of 2 cards per chunk
        cards_per_chunk = max(2, min(5, card_count // chunk_count + 1))

        # 5. Generate flashcards from each chunk
        all_flashcards = []
        progress_counter = 0

        # Process each chunk to generate flashcards
        for chunk in chunks:
            # Skip chunks that are too small
            if len(chunk.page_content.strip()) < 100:
                continue

            # Generate flashcards from this chunk
            chunk_cards = generate_flashcards_from_chunk(
                chunk=chunk,
                llm=llm,
                difficulty_level=difficulty_level,
                focus_areas=focus_areas,
                target_count=cards_per_chunk
            )

            # Add cards to the collection
            all_flashcards.extend(chunk_cards)
            progress_counter += 1


            # If we have enough cards, stop generating
            if len(all_flashcards) >= card_count:
                break

        # 6. Apply advanced learning techniques to enhance flashcards
        enhanced_flashcards = enhance_flashcards_with_learning_techniques(all_flashcards, llm)

        # 7. Store document info in MongoDB
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

        # 8. Create flashcard set
        flashcard_set_data = {
            "user_id": user_id,
            "document_id": document_id,
            "title": f"Flashcards: {os.path.basename(pdf_url)}",
            "description": f"Created from {pdf_url}",
            "flashcard_count": len(enhanced_flashcards),
            "created_at": datetime.datetime.utcnow(),
            "tags": tag_categories or []
        }

        # Insert flashcard set into MongoDB
        sets_collection = db["flashcard_sets"]
        set_result = sets_collection.insert_one(flashcard_set_data)
        flashcard_set_id = set_result.inserted_id

        # 9. Store flashcards in MongoDB
        flashcards_collection = db["flashcards"]
        stored_flashcards = []

        for card in enhanced_flashcards:
            # Skip invalid cards
            if not isinstance(card, dict) or not card.get("front") or not card.get("back"):
                continue

            # Format the flashcard for storage
            flashcard_data = {
                "user_id": user_id,
                "document_id": document_id,
                "front_text": card["front"],
                "back_text": card["back"],
                "difficulty": card.get("difficulty", "medium"),
                "category": card.get("category", "general"),
                "tags": tag_categories or [],
                "created_at": datetime.datetime.utcnow(),
                "review_count": 0,
                "confidence_level": 0,
                "metadata": card.get("metadata", {})
            }

            # Insert flashcard
            result = flashcards_collection.insert_one(flashcard_data)

            # Add to stored flashcards
            flashcard_data["_id"] = str(result.inserted_id)
            stored_flashcards.append(flashcard_data)

        # Prepare sample flashcards for the response
        sample_size = min(5, len(stored_flashcards))
        sample_flashcards = []

        for i in range(sample_size):
            sample_flashcards.append({
                "front": stored_flashcards[i]["front_text"],
                "back": stored_flashcards[i]["back_text"]
            })

        return {
            "status": "success",
            "flashcard_set_id": str(flashcard_set_id),
            "document_id": str(document_id),
            "flashcard_count": len(stored_flashcards),
            "sample_flashcards": sample_flashcards
        }

    except Exception as e:
        error_message = f"Error generating flashcards: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "error_message": error_message
        }


def enhance_flashcards_with_learning_techniques(all_flashcards: List[Dict], llm: Any) -> List[Dict]:
    """
    Applies evidence-based learning techniques to enhance flashcards.

    Techniques include:
    1. Spaced repetition organization (difficulty-based metadata)
    2. Knowledge connections between cards
    3. Adding retrieval cues
    4. Ensuring proper knowledge chunking

    Args:
        all_flashcards: List of generated flashcards
        llm: Language model for enhancement

    Returns:
        List of enhanced flashcards
    """
    if not all_flashcards:
        return []

    # Skip enhancement if we have too many cards to process
    if len(all_flashcards) > 50:
        # Just ensure all cards have required fields
        for card in all_flashcards:
            if not card.get("difficulty"):
                card["difficulty"] = "medium"
            if not card.get("category"):
                card["category"] = "general"
        return all_flashcards

    try:
        # Create enhancement prompt
        enhancement_template = """
        You are an expert in educational psychology and learning science. 
        I have a set of flashcards that need to be enhanced using evidence-based learning techniques.

        Apply these learning science principles to improve the flashcards:
        1. Ensure questions use active recall rather than simple recognition
        2. Add memory cues where helpful
        3. Break down complex concepts where needed
        4. Ensure accurate difficulty ratings (easy, medium, hard)
        5. Add meaningful categories/tags
        6. Organize information for better retention

        Here are the flashcards:
        {flashcards}

        Return the enhanced flashcards in the same JSON format with the same fields.
        Make your changes subtle but effective. Maintain the original meaning and core content.
        """

        # Prepare flashcards for the prompt (limit to avoid token issues)
        max_cards_per_batch = 10
        enhanced_flashcards = []

        # Process in batches
        for i in range(0, len(all_flashcards), max_cards_per_batch):
            batch = all_flashcards[i:i + max_cards_per_batch]

            # Convert to string for the prompt
            batch_text = json.dumps(batch, indent=2)

            # Create and run the enhancement chain
            prompt = PromptTemplate(
                input_variables=["flashcards"],
                template=enhancement_template
            )

            chain = LLMChain(llm=llm, prompt=prompt)
            response = chain.run(flashcards=batch_text)

            # Extract enhanced cards
            try:
                enhanced_batch = extract_json_from_llm_response(response)
                if enhanced_batch:
                    enhanced_flashcards.extend(enhanced_batch)
                else:
                    # If parsing failed, keep original cards
                    enhanced_flashcards.extend(batch)
            except:
                # If error, keep original batch
                enhanced_flashcards.extend(batch)

        # If we lost any cards in the process, return original
        if len(enhanced_flashcards) < len(all_flashcards) * 0.8:
            return all_flashcards

        return enhanced_flashcards

    except Exception as e:
        print(f"Error enhancing flashcards: {str(e)}")
        # If enhancement fails, return original flashcards
        return all_flashcards