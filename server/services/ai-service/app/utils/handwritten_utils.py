import os
import tempfile
import logging
import requests
from typing import List, Optional
from langchain.schema import Document
from PIL import Image
import pytesseract
from azure.storage.blob import BlobServiceClient
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

# Configure OCR - set Tesseract path if not in PATH
if os.getenv("TESSERACT_PATH"):
    pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH")


def is_image_url(url: str) -> bool:
    """
    Determines if a URL is likely an image based on extension

    Args:
        url: URL to check

    Returns:
        bool: True if the URL is likely an image, False otherwise
    """
    # Parse the URL
    parsed_url = urlparse(url)

    # Check the file extension
    path = parsed_url.path.lower()
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']

    return any(path.endswith(ext) for ext in image_extensions)


def process_image_with_tesseract(image_path: str) -> Optional[str]:
    """
    Process an image with Tesseract OCR

    Args:
        image_path: Path to the image file

    Returns:
        str: Extracted text or None if extraction fails
    """
    try:
        # Open the image with PIL
        image = Image.open(image_path)

        # Use pytesseract to extract text (with optimal settings for handwriting)
        text = pytesseract.image_to_string(
            image,
            lang='eng',  # Can be changed based on language
            config='--psm 6 --oem 3'  # Page segmentation mode & OCR Engine mode
        )

        logger.info(f"Successfully extracted text with Tesseract from {image_path}")
        return text.strip()

    except Exception as e:
        logger.error(f"Error extracting text with Tesseract from {image_path}: {str(e)}")
        return None


def process_image_with_azure(image_path: str) -> Optional[str]:
    """
    Process an image with Azure Form Recognizer (better for handwriting)

    Args:
        image_path: Path to the image file

    Returns:
        str: Extracted text or None if extraction fails
    """
    try:
        # Get Form Recognizer credentials from environment
        endpoint = os.getenv("AZURE_FORM_RECOGNIZER_ENDPOINT")
        key = os.getenv("AZURE_FORM_RECOGNIZER_KEY")

        if not endpoint or not key:
            logger.warning("Azure Form Recognizer credentials not found, falling back to Tesseract")
            return process_image_with_tesseract(image_path)

        # Create client
        document_analysis_client = DocumentAnalysisClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )

        # Read the file content
        with open(image_path, "rb") as f:
            file_content = f.read()

        # Begin analysis (using prebuilt-read model for handwriting)
        poller = document_analysis_client.begin_analyze_document(
            "prebuilt-read", file_content
        )
        result = poller.result()

        # Extract text from the result
        extracted_text = ""
        for page in result.pages:
            for line in page.lines:
                extracted_text += line.content + "\n"

        logger.info(f"Successfully extracted text with Azure Form Recognizer from {image_path}")
        return extracted_text.strip()

    except Exception as e:
        logger.error(f"Error with Azure Form Recognizer for {image_path}: {str(e)}")
        logger.info("Falling back to Tesseract OCR")
        return process_image_with_tesseract(image_path)


def load_handwritten_from_url(image_url: str) -> Optional[List[Document]]:
    """
    Downloads a handwritten note image from a URL and processes it using OCR

    Args:
        image_url: URL of the image to download and process

    Returns:
        List[Document]: List of Document objects or None if processing fails
    """
    try:
        # Set up headers to mimic a regular browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
        }

        # Download the image
        response = requests.get(image_url, stream=True, headers=headers)
        response.raise_for_status()

        # Check content type to ensure it's an image
        content_type = response.headers.get('Content-Type', '')
        if not content_type.startswith('image/'):
            logger.warning(f"Content type does not appear to be an image: {content_type}")

        # Create a temporary file for the image
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_path = temp_file.name
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)

        # Try Azure Form Recognizer first (better for handwriting)
        extracted_text = process_image_with_azure(temp_path)

        # If Azure fails or returns empty, try Tesseract
        if not extracted_text:
            extracted_text = process_image_with_tesseract(temp_path)

        # Clean up temporary file
        os.unlink(temp_path)

        # If we got text, create a Document
        if extracted_text:
            doc = Document(
                page_content=extracted_text,
                metadata={
                    "source": image_url,
                    "type": "handwritten_notes"
                }
            )

            logger.info(f"Successfully processed handwritten notes from {image_url}")
            return [doc]
        else:
            logger.error(f"Failed to extract text from {image_url}")
            return None

    except Exception as e:
        logger.error(f"Error processing handwritten notes from {image_url}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None


def load_handwritten_from_storage_url(
        storage_url: str,
        connection_string: str = None
) -> Optional[List[Document]]:
    """
    Loads a handwritten notes image from Azure Blob Storage and processes it

    Args:
        storage_url: Azure Blob Storage URL to the image
        connection_string: Azure Storage connection string (uses .env if not provided)

    Returns:
        List[Document]: List of Document objects or None if processing fails
    """
    try:
        # Use environment variables if not provided
        if connection_string is None:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                logger.error("Azure connection string not provided and not found in environment variables")
                return None

        # Parse the storage URL
        parsed_url = urlparse(storage_url)

        # Check if it's a valid Azure blob storage URL
        if not parsed_url.netloc.endswith('.blob.core.windows.net'):
            logger.error(f"URL does not appear to be an Azure Blob Storage URL: {storage_url}")
            return None

        # Extract path components - remove leading slash
        path = parsed_url.path
        if path.startswith('/'):
            path = path[1:]

        # Split into container and blob name
        parts = path.split('/', 1)
        if len(parts) != 2:
            logger.error(f"URL does not contain both container and blob name: {storage_url}")
            return None

        container_name = parts[0]
        blob_name = parts[1]

        logger.info(f"Parsed URL - Container: {container_name}, Blob: {blob_name}")

        # Create a BlobServiceClient using the connection string
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)

        # Get the container client
        container_client = blob_service_client.get_container_client(container_name)

        # Get the blob client
        blob_client = container_client.get_blob_client(blob_name)

        # Create a temporary file for the image
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_path = temp_file.name

            # Download the blob content
            blob_data = blob_client.download_blob()

            # Write the image content to the temporary file
            temp_file.write(blob_data.readall())

        # Try Azure Form Recognizer first (better for handwriting)
        extracted_text = process_image_with_azure(temp_path)

        # If Azure fails or returns empty, try Tesseract
        if not extracted_text:
            extracted_text = process_image_with_tesseract(temp_path)

        # Clean up temporary file
        os.unlink(temp_path)

        # If we got text, create a Document
        if extracted_text:
            doc = Document(
                page_content=extracted_text,
                metadata={
                    "source": storage_url,
                    "type": "handwritten_notes"
                }
            )

            logger.info(f"Successfully processed handwritten notes from {storage_url}")
            return [doc]
        else:
            logger.error(f"Failed to extract text from {storage_url}")
            return None

    except Exception as e:
        logger.error(f"Error processing handwritten notes from {storage_url}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None


def load_handwritten_from_private_url(
        private_url: str,
        connection_string: str = None,
        container_name: str = None
) -> Optional[List[Document]]:
    """
    Processes a handwritten notes image from a private URL (handles both Azure and standard URLs)

    Args:
        private_url: URL of the handwritten notes image
        connection_string: Azure Storage connection string (if applicable)
        container_name: Azure Blob container name (if applicable)

    Returns:
        List[Document]: List of Document objects or None if processing fails
    """
    try:
        # For full Azure storage URLs, use the storage loader
        if private_url.startswith('https://') and '.blob.core.windows.net' in private_url:
            return load_handwritten_from_storage_url(
                storage_url=private_url,
                connection_string=connection_string
            )

        # For standard HTTP URLs, use the URL loader
        if private_url.startswith('http://') or private_url.startswith('https://'):
            if '.blob.core.windows.net' not in private_url:
                return load_handwritten_from_url(private_url)

        # If none of the above, assume it's an Azure blob reference
        # Use environment variables if not provided
        if connection_string is None:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                raise ValueError("Azure connection string not provided and not found in environment variables")

        if container_name is None:
            container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
            if not container_name:
                raise ValueError("Container name not provided and not found in environment variables")

        # Create a BlobServiceClient using the connection string
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)

        # Get the container client
        container_client = blob_service_client.get_container_client(container_name)

        # Get the blob client (assuming private_url is the blob name)
        blob_client = container_client.get_blob_client(private_url)

        # Create a temporary file for the image
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_path = temp_file.name

            # Download the blob content
            blob_data = blob_client.download_blob()

            # Write the image content to the temporary file
            temp_file.write(blob_data.readall())

        # Try Azure Form Recognizer first (better for handwriting)
        extracted_text = process_image_with_azure(temp_path)

        # If Azure fails or returns empty, try Tesseract
        if not extracted_text:
            extracted_text = process_image_with_tesseract(temp_path)

        # Clean up temporary file
        os.unlink(temp_path)

        # If we got text, create a Document
        if extracted_text:
            doc = Document(
                page_content=extracted_text,
                metadata={
                    "source": f"azure-blob://{container_name}/{private_url}",
                    "type": "handwritten_notes"
                }
            )

            logger.info(f"Successfully processed handwritten notes from blob: {private_url}")
            return [doc]
        else:
            logger.error(f"Failed to extract text from blob: {private_url}")
            return None

    except Exception as e:
        logger.error(f"Error processing handwritten notes from private URL {private_url}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None