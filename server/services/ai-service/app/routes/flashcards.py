from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from app.models.flashcard import FlashcardCreate, FlashcardResponse, Flashcard
from app.services.flashcard_service import (
    create_flashcards_from_pdf,
    get_flashcard_by_id,
    get_flashcards_for_user,
    get_flashcards_by_document,
    update_flashcard_review_status,
    delete_flashcard
)
from typing import List, Optional
from bson import ObjectId

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("/", response_model=FlashcardResponse)
async def create_flashcards(
        flashcard_data: FlashcardCreate,
        background_tasks: BackgroundTasks
):
    """
    Create flashcards from a PDF URL.
    This endpoint processes the request asynchronously.

    User ID is expected to be validated by the API gateway.
    """
    # User ID comes directly from the request payload
    user_id = flashcard_data.user_id

    # Start flashcard generation in background task
    background_tasks.add_task(
        create_flashcards_from_pdf,
        pdf_url=flashcard_data.pdf_url,
        user_id=user_id,
        difficulty_level=flashcard_data.difficulty_level,
        tag_categories=flashcard_data.tag_categories,
        focus_areas=flashcard_data.focus_areas,
        card_count=flashcard_data.card_count,
        include_images=flashcard_data.include_images
    )

    # Return immediate response
    return {
        "status": "processing",
        "message": "Flashcard generation started. Check status endpoint for results."
    }


@router.get("/set/{flashcard_set_id}", response_model=dict)
async def get_flashcard_set(
        flashcard_set_id: str,
        user_id: str
):
    """
    Retrieve a set of flashcards by the set ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_flashcards_by_document(flashcard_set_id, user_id)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    return result


@router.get("/{flashcard_id}", response_model=dict)
async def get_flashcard(
        flashcard_id: str,
        user_id: str
):
    """
    Retrieve a single flashcard by its ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_flashcard_by_id(flashcard_id)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    # Verify the user has access to this flashcard
    if result["flashcard"]["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this flashcard"
        )

    return {
        "status": "success",
        "flashcard": result["flashcard"]
    }


@router.get("/", response_model=dict)
async def list_flashcards(
        user_id: str,
        limit: int = 50,
        difficulty: Optional[str] = None,
        tags: Optional[List[str]] = Query(None),
        category: Optional[str] = None,
        document_id: Optional[str] = None,
        confidence_below: Optional[int] = None
):
    """
    Retrieve flashcards for the specified user with optional filters.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    filters = {}

    if difficulty:
        filters["difficulty"] = difficulty
    if tags:
        filters["tags"] = {"$in": tags}
    if category:
        filters["category"] = category
    if document_id:
        filters["document_id"] = ObjectId(document_id)
    if confidence_below is not None:
        filters["confidence_level"] = {"$lte": confidence_below}

    result = get_flashcards_for_user(user_id, limit, filters)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.put("/{flashcard_id}/review", response_model=dict)
async def update_review(
        flashcard_id: str,
        user_id: str,
        confidence_level: int
):
    """
    Update the review status of a flashcard.

    - flashcard_id: The ID of the flashcard
    - user_id: The user's ID
    - confidence_level: The user's confidence level (0-5)
    """
    if not 0 <= confidence_level <= 5:
        raise HTTPException(status_code=400, detail="Confidence level must be between 0 and 5")

    # First verify the flashcard exists and belongs to the user
    flashcard_result = get_flashcard_by_id(flashcard_id)

    if flashcard_result["status"] == "error":
        raise HTTPException(status_code=404, detail="Flashcard not found")

    if flashcard_result["flashcard"]["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this flashcard"
        )

    # Update the flashcard
    result = update_flashcard_review_status(flashcard_id, confidence_level)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.delete("/{flashcard_id}", response_model=dict)
async def remove_flashcard(
        flashcard_id: str,
        user_id: str
):
    """
    Delete a flashcard by its ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    try:
        # First verify the flashcard exists and belongs to the user
        flashcard_result = get_flashcard_by_id(flashcard_id)

        if flashcard_result["status"] == "error":
            raise HTTPException(status_code=404, detail="Flashcard not found")

        if flashcard_result["flashcard"]["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete this flashcard"
            )

        # Delete the flashcard
        result = delete_flashcard(flashcard_id)

        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        return {
            "status": "success",
            "message": f"Flashcard {flashcard_id} successfully deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting flashcard: {str(e)}")


@router.delete("/document/{document_id}", response_model=dict)
async def remove_document_flashcards(
        document_id: str,
        user_id: str
):
    """
    Delete all flashcards associated with a document.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    from app.utils.db_utils import get_mongodb_client

    try:
        db_client = get_mongodb_client()
        db = db_client["study_assistant"]
        flashcards_collection = db["flashcards"]

        # Delete flashcards for this document and user
        result = flashcards_collection.delete_many({
            "user_id": user_id,
            "document_id": ObjectId(document_id)
        })

        return {
            "status": "success",
            "message": f"Deleted {result.deleted_count} flashcards for document {document_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting flashcards: {str(e)}")