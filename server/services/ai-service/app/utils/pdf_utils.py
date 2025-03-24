import os
import tempfile
import requests
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
import logging
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient
from azure.core.exceptions import ResourceNotFoundError, ServiceRequestError
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables from .env file
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)


def load_pdf_from_storage_url(
        storage_url: str,
        connection_string: str = None
) -> Optional[List[Document]]:
    """
    Loads a PDF directly from an Azure Storage URL using connection string.

    Args:
        storage_url: Complete Azure Storage URL to the PDF
        connection_string: Azure Storage connection string (uses .env if not provided)

    Returns:
        List[Document]: List of Document objects or None if loading fails
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

        # Create a temporary file to store the downloaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_path = temp_file.name

            # Download the blob content
            blob_data = blob_client.download_blob()

            # Write the PDF content to the temporary file
            temp_file.write(blob_data.readall())

        # Load the PDF using PyPDFLoader
        loader = PyPDFLoader(temp_path)
        documents = loader.load()

        # Clean up the temporary file
        os.unlink(temp_path)

        # Add metadata to documents
        for doc in documents:
            if not doc.metadata:
                doc.metadata = {}
            doc.metadata["source"] = storage_url

        logger.info(f"Successfully loaded PDF from storage URL: {storage_url}: {len(documents)} pages")
        return documents

    except ResourceNotFoundError as e:
        logger.error(f"Azure Blob not found: {storage_url}: {str(e)}")
        return None
    except ServiceRequestError as e:
        logger.error(f"Azure service request error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error loading PDF from storage URL {storage_url}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None


def load_pdf_from_azure_blob(
        connection_string: str = None,
        container_name: str = None,
        blob_name: str = None
) -> Optional[List[Document]]:
    """
    Downloads a PDF from Azure Blob Storage and loads it using LangChain's PyPDFLoader.

    Args:
        connection_string: Azure Storage connection string
        container_name: Name of the Azure Blob container
        blob_name: Name of the blob (PDF file path in the container)

    Returns:
        List[Document]: List of Document objects or None if loading fails
    """
    try:
        # Use environment variables if not provided
        if connection_string is None:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                logger.error("Azure connection string not provided and not found in environment variables")
                raise ValueError("Azure connection string not provided and not found in environment variables")

        if container_name is None:
            container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
            if not container_name:
                logger.error("Container name not provided and not found in environment variables")
                raise ValueError("Container name not provided and not found in environment variables")

        if blob_name is None or blob_name == "":
            logger.error(f"Blob name must be provided, received: {blob_name}")
            raise ValueError("Blob name must be provided")

        logger.info(f"Loading PDF from Azure Blob - Container: {container_name}, Blob: {blob_name}")

        # Create a BlobServiceClient using the connection string
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)

        # Get the container client
        container_client = blob_service_client.get_container_client(container_name)

        # Get the blob client
        blob_client = container_client.get_blob_client(blob_name)

        # Create a temporary file to store the downloaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_path = temp_file.name

            # Download the blob content
            blob_data = blob_client.download_blob()

            # Write the PDF content to the temporary file
            temp_file.write(blob_data.readall())

        # Load the PDF using PyPDFLoader
        loader = PyPDFLoader(temp_path)
        documents = loader.load()

        # Clean up the temporary file
        os.unlink(temp_path)

        # Add metadata to documents
        for doc in documents:
            if not doc.metadata:
                doc.metadata = {}
            doc.metadata["source"] = f"azure-blob://{container_name}/{blob_name}"

        logger.info(f"Successfully loaded PDF from Azure Blob: {container_name}/{blob_name}: {len(documents)} pages")
        return documents

    except ResourceNotFoundError as e:
        logger.error(f"Azure Blob not found: {container_name}/{blob_name}: {str(e)}")
        return None
    except ServiceRequestError as e:
        logger.error(f"Azure service request error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error loading PDF from Azure Blob {container_name}/{blob_name}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None


def load_pdf_from_private_url(
        private_url: str,
        connection_string: str = None,
        container_name: str = None
) -> Optional[List[Document]]:
    """
    Parses a private Azure URL and loads the PDF from Azure Blob Storage.

    Args:
        private_url: Private URL pointing to Azure Blob (could be in various formats)
        connection_string: Azure Storage connection string
        container_name: Name of the Azure Blob container (can be overridden if contained in URL)

    Returns:
        List[Document]: List of Document objects or None if loading fails
    """
    try:
        # For full storage URLs, use the direct storage URL loader
        if private_url.startswith('https://') and '.blob.core.windows.net' in private_url:
            return load_pdf_from_storage_url(
                storage_url=private_url,
                connection_string=connection_string
            )

        # Use environment variables if not provided
        if connection_string is None:
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                raise ValueError("Azure connection string not provided and not found in environment variables")

        if container_name is None:
            container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME")
            if not container_name:
                raise ValueError("Container name not provided and not found in environment variables")

        # Extract the blob name from the private URL
        # This is a simplified example - you might need to adjust based on your URL format
        if private_url.startswith("https://"):
            # Parse URL to extract blob path
            # Example format: https://accountname.blob.core.windows.net/containername/path/to/file.pdf
            parts = private_url.split('/')
            if len(parts) < 5:
                logger.error(f"Invalid Azure Blob URL format: {private_url}")
                return None

            # If URL contains container name, use it instead of the provided one
            url_container = parts[3]
            if container_name and url_container != container_name:
                logger.info(f"Using container name from URL: {url_container} instead of provided: {container_name}")
                container_name = url_container

            # Get the blob path (everything after the container name)
            blob_name = '/'.join(parts[4:])
            if not blob_name:
                logger.error(f"Could not extract blob name from URL: {private_url}")
                return None
        else:
            # Assume the private_url is just the blob name
            blob_name = private_url

        logger.info(f"Extracted blob name: {blob_name} from URL: {private_url}")

        # Use the Azure blob loading function
        return load_pdf_from_azure_blob(
            connection_string=connection_string,
            container_name=container_name,
            blob_name=blob_name
        )

    except Exception as e:
        logger.error(f"Error parsing private URL and loading PDF: {str(e)}")
        return None


# Keep the original functions for backward compatibility
def load_pdf_from_url(pdf_url: str) -> Optional[List[Document]]:
    """
    Downloads a PDF from a URL and loads it using LangChain's PyPDFLoader.

    Args:
        pdf_url: URL of the PDF to download and process

    Returns:
        List[Document]: List of Document objects or None if loading fails
    """
    try:
        # Set up headers to mimic a regular browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://ieeexplore.ieee.org/',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1'
        }

        # Download the PDF with headers
        response = requests.get(pdf_url, stream=True, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_path = temp_file.name
            # Write the PDF content to the temporary file
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)

        # Load the PDF using PyPDFLoader
        loader = PyPDFLoader(temp_path)
        documents = loader.load()

        # Clean up the temporary file
        os.unlink(temp_path)

        # Add metadata to documents
        for doc in documents:
            if not doc.metadata:
                doc.metadata = {}
            doc.metadata["source"] = pdf_url

        logger.info(f"Successfully loaded PDF from {pdf_url}: {len(documents)} pages")
        return documents

    except requests.RequestException as e:
        logger.error(f"Failed to download PDF from {pdf_url}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error loading PDF from {pdf_url}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals():
            try:
                os.unlink(temp_path)
            except:
                pass
        return None


def load_pdf_from_path(file_path: str) -> Optional[List[Document]]:
    """
    Loads a PDF from a local file path using LangChain's PyPDFLoader.

    Args:
        file_path: Path to the PDF file

    Returns:
        List[Document]: List of Document objects or None if loading fails
    """
    try:
        # Verify the file exists
        if not os.path.isfile(file_path):
            logger.error(f"PDF file not found at path: {file_path}")
            return None

        # Load the PDF using PyPDFLoader
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # Add metadata to documents
        for doc in documents:
            if not doc.metadata:
                doc.metadata = {}
            doc.metadata["source"] = file_path

        logger.info(f"Successfully loaded PDF from {file_path}: {len(documents)} pages")
        return documents

    except Exception as e:
        logger.error(f"Error loading PDF from {file_path}: {str(e)}")
        return None


def extract_text_from_pdf(file_path: str) -> Optional[str]:
    """
    Extracts all text from a PDF file and returns it as a single string.

    Args:
        file_path: Path to the PDF file

    Returns:
        str: Extracted text or None if extraction fails
    """
    try:
        documents = load_pdf_from_path(file_path)
        if not documents:
            return None

        # Concatenate text from all pages
        full_text = "\n\n".join([doc.page_content for doc in documents])
        return full_text

    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {str(e)}")
        return None


def extract_text_from_azure_blob_pdf(
        connection_string: str = None,
        container_name: str = None,
        blob_name: str = None
) -> Optional[str]:
    """
    Extracts all text from a PDF stored in Azure Blob Storage and returns it as a single string.

    Args:
        connection_string: Azure Storage connection string
        container_name: Name of the Azure Blob container
        blob_name: Name of the blob (PDF file path in the container)

    Returns:
        str: Extracted text or None if extraction fails
    """
    try:
        documents = load_pdf_from_azure_blob(
            connection_string=connection_string,
            container_name=container_name,
            blob_name=blob_name
        )

        if not documents:
            return None

        # Concatenate text from all pages
        full_text = "\n\n".join([doc.page_content for doc in documents])
        return full_text

    except Exception as e:
        logger.error(f"Error extracting text from Azure Blob PDF {container_name}/{blob_name}: {str(e)}")
        return None


def extract_text_from_storage_url(
        storage_url: str,
        connection_string: str = None
) -> Optional[str]:
    """
    Extracts all text from a PDF referenced by an Azure Storage URL.

    Args:
        storage_url: Complete Azure Storage URL to the PDF
        connection_string: Azure Storage connection string (uses .env if not provided)

    Returns:
        str: Extracted text or None if extraction fails
    """
    try:
        documents = load_pdf_from_storage_url(
            storage_url=storage_url,
            connection_string=connection_string
        )

        if not documents:
            return None

        # Concatenate text from all pages
        full_text = "\n\n".join([doc.page_content for doc in documents])
        return full_text

    except Exception as e:
        logger.error(f"Error extracting text from storage URL {storage_url}: {str(e)}")
        return None


def is_pdf_url(url: str) -> bool:
    """
    Check if URL is a PDF

    Args:
        url: URL to check

    Returns:
        bool: True if PDF, False otherwise
    """
    # First check file extension
    if url.lower().endswith('.pdf'):
        return True

    # Then check URL path for PDF indicators
    if '/pdf/' in url.lower() or '/pdfs/' in url.lower():
        return True

    # More sophisticated checks could be added but might require HEAD requests
    return False
