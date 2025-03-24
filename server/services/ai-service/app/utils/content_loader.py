import os
import logging
from typing import List, Optional, Dict, Any
from langchain.schema import Document
from urllib.parse import urlparse

# Import the utility modules for different content types
from app.utils.pdf_utils import load_pdf_from_private_url, is_pdf_url
from app.utils.youtube_utils import load_youtube_content, is_youtube_url
from app.utils.powerpoint_utils import load_pptx_from_private_url, is_powerpoint_url
from app.utils.webpage_utils import load_webpage_content, is_webpage_url
from app.utils.handwritten_utils import load_handwritten_from_private_url, is_image_url

# Set up logging
logger = logging.getLogger(__name__)

def detect_content_type(url: str) -> str:
    """
    Detects the type of content at the specified URL

    Args:
        url: URL to check

    Returns:
        str: Content type identifier ('pdf', 'youtube', 'powerpoint', 'webpage', 'image', 'unknown')
    """
    if is_pdf_url(url):
        return 'pdf'
    elif is_youtube_url(url):
        return 'youtube'
    elif is_powerpoint_url(url):
        return 'powerpoint'
    elif is_image_url(url):
        return 'image'
    elif is_webpage_url(url):
        return 'webpage'
    else:
        # Default to webpage for anything else
        return 'unknown'

def load_content(
        url: str,
        content_type: str = None,
        connection_string: str = None,
        container_name: str = None
) -> Optional[List[Document]]:
    """
    Loads and processes content from a URL based on the content type

    Args:
        url: URL of the content to load
        content_type: Type of content ('pdf', 'youtube', 'powerpoint', 'webpage', 'image')
                      If None, type will be auto-detected
        connection_string: Azure Storage connection string (if applicable)
        container_name: Azure Blob container name (if applicable)

    Returns:
        List[Document]: List of Document objects or None if loading fails
    """
    try:
        # Auto-detect content type if not provided
        if not content_type:
            content_type = detect_content_type(url)
            logger.info(f"Auto-detected content type: {content_type} for URL: {url}")

        # Load content based on type
        if content_type == 'pdf':
            return load_pdf_from_private_url(
                private_url=url,
                connection_string=connection_string,
                container_name=container_name
            )
        elif content_type == 'youtube':
            return load_youtube_content(url)
        elif content_type == 'powerpoint':
            return load_pptx_from_private_url(
                private_url=url,
                connection_string=connection_string,
                container_name=container_name
            )
        elif content_type == 'image':
            return load_handwritten_from_private_url(
                private_url=url,
                connection_string=connection_string,
                container_name=container_name
            )
        elif content_type == 'webpage':
            return load_webpage_content(url)
        else:
            # For unknown content types, try webpage loader first, then PDF as fallback
            logger.warning(f"Unknown content type for {url}, trying webpage loader")
            webpage_docs = load_webpage_content(url)

            if webpage_docs:
                return webpage_docs

            logger.warning(f"Webpage loader failed for {url}, trying PDF loader")
            return load_pdf_from_private_url(
                private_url=url,
                connection_string=connection_string,
                container_name=container_name
            )

    except Exception as e:
        logger.error(f"Error loading content from {url}: {str(e)}")
        return None


def load_multiple_content(
        urls: List[str],
        content_types: List[str] = None,
        connection_string: str = None,
        container_name: str = None
) -> Dict[str, Any]:
    """
    Loads and processes content from multiple URLs

    Args:
        urls: List of URLs to load
        content_types: List of content types (must match the URLs list)
        connection_string: Azure Storage connection string (if applicable)
        container_name: Azure Blob container name (if applicable)

    Returns:
        Dict: Dictionary with results for each URL
    """
    results = {}

    if content_types and len(content_types) != len(urls):
        logger.error("If content_types is provided, it must have the same length as urls")
        return {"status": "error", "message": "Content types list must match URLs list"}

    for i, url in enumerate(urls):
        try:
            content_type = content_types[i] if content_types else None
            documents = load_content(
                url=url,
                content_type=content_type,
                connection_string=connection_string,
                container_name=container_name
            )

            results[url] = {
                "status": "success" if documents else "error",
                "documents": documents,
                "document_count": len(documents) if documents else 0,
                "content_type": content_type or detect_content_type(url)
            }

        except Exception as e:
            logger.error(f"Error loading content from {url}: {str(e)}")
            results[url] = {
                "status": "error",
                "error_message": str(e),
                "documents": None,
                "document_count": 0
            }

    return results