from fastapi import APIRouter, HTTPException, Query, Header
from app.models.flashcard import FlashcardCreate, FlashcardResponse, FlashcardUpdateRequest, FlashcardReviewRequest
from app.services.flashcard_service import (
    create_flashcards_from_content,
    get_flashcard_by_id,
    get_flashcards_for_user,
    get_flashcards_by_document,
    update_flashcard,
    update_flashcard_review_status,
    delete_flashcard,
    get_flashcards_by_set
)
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("/", response_model=FlashcardResponse)
async def create_flashcards(flashcard_data: FlashcardCreate):
    """
    Create new flashcards from any supported content URL (PDF, YouTube, PowerPoint, etc.).
    This endpoint processes the request synchronously - the client will wait until processing is complete.

    User ID is expected to be validated by the API gateway.
    """
    # User ID comes directly from the request payload
    user_id = flashcard_data.user_id

    # Process the content synchronously (client waits for complete processing)
    result = create_flashcards_from_content(
        content_url=flashcard_data.content_url,
        user_id=user_id,
        difficulty_level=flashcard_data.difficulty_level,
        tags=flashcard_data.tags,
        focus_areas=flashcard_data.focus_areas,
        card_count=flashcard_data.card_count,
        content_type=flashcard_data.content_type
    )

    # Check if processing was successful
    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=result.get("error_message", "An error occurred during flashcard generation")
        )

    # Return the complete flashcard generation result
    return {
        "status": "success",
        "flashcard_set_id": result["flashcard_set_id"],
        "document_id": result["document_id"],
        "flashcard_count": result["flashcard_count"],
        "sample_flashcards": result["sample_flashcards"],
        "content_type": result.get("content_type", "pdf")
    }


@router.get("/{flashcard_id}", response_model=dict)
async def read_flashcard(
        flashcard_id: str,
        x_user_id : str = Header(..., alias="X-User-ID")
):
    """
    Retrieve a flashcard by its ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_flashcard_by_id(flashcard_id, x_user_id)
    user_id = x_user_id

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    # Verify the user has access to this flashcard
    if result["flashcard"]["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this flashcard"
        )

    return result

@router.get("/set/{flashcard_set_id}", response_model=dict)
async def get_flashcard_set(
        flashcard_set_id: str,
        x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Retrieve all flashcards associated with a specific flashcard set for a user.

    User ID is passed in the header and expected to be validated by the API gateway.
    """
    result = get_flashcards_by_set(flashcard_set_id, x_user_id)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    return result

@router.get("/document/{document_id}", response_model=dict)
async def get_document_flashcards(
        document_id: str,
        user_id: str
):
    """
    Retrieve all flashcards associated with a specific document for a user.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_flashcards_by_document(document_id, user_id)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    return result


@router.get("/", response_model=dict)
async def list_flashcards(
        user_id: str,
        limit: int = 50,
        content_type: Optional[str] = None,
        tag: Optional[str] = None,
        difficulty: Optional[str] = None
):
    """
    Retrieve all flashcards for the specified user.
    Optionally filter by content type, tag, or difficulty.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    filters = {}

    if content_type:
        filters["content_type"] = content_type

    if tag:
        filters["tags"] = tag

    if difficulty:
        filters["difficulty"] = difficulty

    result = get_flashcards_for_user(user_id, limit, filters)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.patch("/{flashcard_id}", response_model=dict)
async def update_flashcard_endpoint(
        flashcard_id: str,
        update_data: FlashcardUpdateRequest
):
    """
    Update an existing flashcard.

    User ID is expected to be validated by the API gateway.
    """
    try:
        # First verify the flashcard exists and belongs to the user
        flashcard_result = get_flashcard_by_id(flashcard_id)

        if flashcard_result["status"] == "error":
            raise HTTPException(status_code=404, detail="Flashcard not found")

        if flashcard_result["flashcard"]["user_id"] != update_data.user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this flashcard"
            )

        # Update the flashcard
        result = update_flashcard(flashcard_id, update_data)

        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating flashcard: {str(e)}")


@router.post("/{flashcard_id}/review", response_model=dict)
async def review_flashcard(
        flashcard_id: str,
        review_data: FlashcardReviewRequest
):
    """
    Update a flashcard's review status after the user has reviewed it.

    User ID is expected to be validated by the API gateway.
    """
    try:
        # First verify the flashcard exists and belongs to the user
        flashcard_result = get_flashcard_by_id(flashcard_id)

        if flashcard_result["status"] == "error":
            raise HTTPException(status_code=404, detail="Flashcard not found")

        if flashcard_result["flashcard"]["user_id"] != review_data.user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to review this flashcard"
            )

        # Update the review status
        result = update_flashcard_review_status(flashcard_id, review_data.confidence_level)

        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating review status: {str(e)}")


@router.delete("/{flashcard_id}", response_model=dict)
async def delete_flashcard_endpoint(
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
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting flashcard: {str(e)}")