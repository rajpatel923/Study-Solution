from fastapi import APIRouter, HTTPException
from app.models.summary import SummaryCreate, SummaryResponse, ContentType
from app.services.summarize_service import summarize_content, get_summary_by_id, get_summaries_for_user
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.post("/", response_model=SummaryResponse)
async def create_summary(summary_data: SummaryCreate):
    """
    Create a new summary from any supported content URL (PDF, YouTube, PowerPoint, etc.).
    This endpoint processes the request synchronously - the client will wait until processing is complete.

    User ID is expected to be validated by the API gateway.
    """
    # User ID comes directly from the request payload
    user_id = summary_data.user_id

    # Process the content synchronously (client waits for complete processing)
    result = summarize_content(
        content_url=summary_data.content_url,
        user_id=user_id,
        prompt=summary_data.prompt,
        summary_length=summary_data.summary_length,
        content_type=summary_data.content_type
    )

    # Check if processing was successful
    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=result.get("error_message", "An error occurred during content summarization")
        )

    # Return the complete summary result
    return {
        "status": "success",
        "summary_id": result["summary_id"],
        "document_id": result["document_id"],
        "summary": result["summary"],
        "word_count": result["word_count"],
        "content_type": result.get("content_type", "unknown")
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
        "word_count": result["summary"]["word_count"],
        "content_type": result["summary"].get("content_type", "pdf")  # Default to PDF for backward compatibility
    }


class SummaryUpdateRequest(BaseModel):
    summary_content: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: str


@router.patch("/{summary_id}", response_model=SummaryResponse)
async def update_summary(
        summary_id: str,
        update_data: SummaryUpdateRequest
):
    """
    Update an existing summary.

    User ID is expected to be validated by the API gateway.
    """
    try:
        # First verify the summary exists and belongs to the user
        summary_result = get_summary_by_id(summary_id)

        if summary_result["status"] == "error":
            raise HTTPException(status_code=404, detail="Summary not found")

        if summary_result["summary"]["user_id"] != update_data.user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to update this summary"
            )

        # Update the summary
        from app.utils.db_utils import get_mongodb_client
        from bson import ObjectId
        import datetime

        db_client = get_mongodb_client()
        db = db_client["ai_service"]
        summaries_collection = db["summaries"]

        # Build update document
        update_doc = {"last_updated": datetime.datetime.utcnow()}

        if update_data.summary_content is not None:
            update_doc["text"] = update_data.summary_content
            # Update word count if content changes
            words = len(update_data.summary_content.split())
            update_doc["word_count"] = words

        if update_data.title is not None:
            update_doc["title"] = update_data.title

        if update_data.tags is not None:
            update_doc["tags"] = update_data.tags

        # Update the document
        result = summaries_collection.update_one(
            {"_id": ObjectId(summary_id)},
            {"$set": update_doc}
        )

        if result.modified_count == 0:
            return {
                "status": "error",
                "message": "No changes made to the summary"
            }

        # Get the updated summary
        updated_summary = get_summary_by_id(summary_id)

        if updated_summary["status"] == "error":
            raise HTTPException(status_code=500, detail="Failed to retrieve updated summary")

        return {
            "status": "success",
            "summary_id": summary_id,
            "document_id": updated_summary["summary"]["document_id"],
            "summary": updated_summary["summary"]["text"],
            "word_count": updated_summary["summary"]["word_count"],
            "content_type": updated_summary["summary"].get("content_type", "pdf")
            # Default to PDF for backward compatibility
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating summary: {str(e)}")


@router.get("/", response_model=dict)
async def list_summaries(
        user_id: str,
        limit: int = 10,
        content_type: Optional[str] = None
):
    """
    Retrieve all summaries for the specified user.
    Optionally filter by content type.

    User ID is passed as a query parameter and expected to be validated by the API gateway.
    """
    result = get_summaries_for_user(user_id, limit)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    # Filter by content type if specified
    if content_type and "summaries" in result:
        result["summaries"] = [
            summary for summary in result["summaries"]
            if summary.get("content_type", "pdf") == content_type
        ]
        result["count"] = len(result["summaries"])

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
        db = db_client["ai_service"]
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