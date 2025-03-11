#summarizer.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.summary import SummaryCreate, SummaryResponse
from app.services.summarize_pdf_service import summarize_pdf_notes, get_summary_by_id, get_summaries_for_user
from typing import List, Optional

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.post("/", response_model=SummaryResponse)
async def create_summary(
        summary_data: SummaryCreate,
        background_tasks: BackgroundTasks
):
    """
    Create a new summary from a PDF URL.
    This endpoint processes the request asynchronously.

    User ID is expected to be validated by the API gateway.
    """
    # User ID comes directly from the request payload now
    user_id = summary_data.user_id

    # Start summarization in background task
    background_tasks.add_task(
        summarize_pdf_notes,
        pdf_url=summary_data.pdf_url,
        user_id=user_id,
        prompt=summary_data.prompt,
        summary_length=summary_data.summary_length
    )

    # Return immediate response
    return {
        "status": "processing",
        "message": "Summary generation started. Check status endpoint for results."
    }


@router.get("/{summary_id}", response_model=SummaryResponse)
async def read_summary(
        summary_id: str,
        user_id: str
):
    """
    Retrieve a summary by its ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_summary_by_id(summary_id)

    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])

    # Verify the user has access to this summary
    if result["summary"]["user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this summary"
        )

    return {
        "status": "success",
        "summary_id": summary_id,
        "document_id": result["summary"]["document_id"],
        "summary": result["summary"]["text"],
        "word_count": result["summary"]["word_count"]
    }


@router.get("/", response_model=dict)
async def list_summaries(
        user_id: str,
        limit: int = 10
):
    """
    Retrieve all summaries for the specified user.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_summaries_for_user(user_id, limit)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return result


@router.delete("/{summary_id}", response_model=dict)
async def delete_summary(
        summary_id: str,
        user_id: str
):
    """
    Delete a summary by its ID.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    try:
        # First verify the summary exists and belongs to the user
        summary_result = get_summary_by_id(summary_id)

        if summary_result["status"] == "error":
            raise HTTPException(status_code=404, detail="Summary not found")

        if summary_result["summary"]["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete this summary"
            )

        # Delete the summary
        from app.utils.db_utils import get_mongodb_client
        from bson import ObjectId

        db_client = get_mongodb_client()
        db = db_client["study_assistant"]
        summaries_collection = db["summaries"]

        result = summaries_collection.delete_one({"_id": ObjectId(summary_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Summary not found")

        return {
            "status": "success",
            "message": f"Summary {summary_id} successfully deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting summary: {str(e)}")