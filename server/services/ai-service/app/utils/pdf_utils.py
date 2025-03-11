import os
import requests
import tempfile
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
import logging

# Set up logging
logger = logging.getLogger(__name__)


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