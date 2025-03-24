import os
import tempfile
import logging
import requests
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
from langchain.schema import Document
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)


def is_webpage_url(url: str) -> bool:
    """
    Determines if a URL is likely a webpage (not a PDF, PowerPoint, etc.)

    Args:
        url: URL to check

    Returns:
        bool: True if the URL is likely a webpage, False otherwise
    """
    # Parse the URL
    parsed_url = urlparse(url)

    # Check if there's a valid URL scheme
    if not parsed_url.scheme or not parsed_url.netloc:
        return False

    # If the URL has a file extension, check if it's a common web page extension
    path = parsed_url.path.lower()
    if '.' in path:
        extension = path.split('.')[-1]
        # These are common non-web page extensions we want to exclude
        excluded_extensions = [
            'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
            'zip', 'rar', 'tar', 'gz', 'mp3', 'mp4', 'avi', 'mov',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff'
        ]
        if extension in excluded_extensions:
            return False

    return True


def load_webpage_content(page_url: str) -> Optional[List[Document]]:
    """
    Loads content from a webpage, processes it, and returns it as Document objects

    Args:
        page_url: URL of the webpage to load

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
            'Cache-Control': 'max-age=0',
        }

        # Make the request
        response = requests.get(page_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Check if the content is HTML
        content_type = response.headers.get('Content-Type', '').lower()
        if 'text/html' not in content_type and 'application/xhtml+xml' not in content_type:
            logger.warning(f"Content-Type is not HTML: {content_type}")
            # If not HTML but we can still parse it, proceed with caution
            if not response.text or '<html' not in response.text.lower():
                logger.error(f"Content does not appear to be HTML: {page_url}")
                return None

        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract the page title
        title = soup.title.text.strip() if soup.title else "Untitled Page"

        # Extract metadata
        metadata = {
            "source": page_url,
            "title": title,
            "type": "webpage"
        }

        # Extract meta description if available
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and 'content' in meta_desc.attrs:
            metadata['description'] = meta_desc['content']

        # Extract meta keywords if available
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords and 'content' in meta_keywords.attrs:
            metadata['keywords'] = meta_keywords['content']

        # Remove script and style elements
        for script in soup(["script", "style", "iframe", "nav", "footer", "aside"]):
            script.extract()

        # Process the main content
        documents = []

        # Extract article or main content if available
        main_content = soup.find(['article', 'main', 'div', 'section'],
                                 id=['content', 'main', 'article', 'post'])

        if not main_content:
            main_content = soup.find(['article', 'main'])

        if not main_content:
            # Fallback to body if no specific content element found
            main_content = soup.body

        if main_content:
            # Process headings and paragraphs to structure the content
            content_elements = main_content.find_all(
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'pre'])

            # Group content into logical sections
            sections = []
            current_section = {"heading": title, "content": ""}

            for element in content_elements:
                if element.name.startswith('h') and len(element.text.strip()) > 0:
                    # If we have content in the current section, add it to sections
                    if current_section["content"].strip():
                        sections.append(current_section)

                    # Start a new section
                    current_section = {"heading": element.text.strip(), "content": ""}
                elif element.name in ['p', 'ul', 'ol', 'blockquote', 'pre'] and len(element.text.strip()) > 0:
                    # Add content to the current section
                    current_section["content"] += element.text.strip() + "\n\n"

            # Add the last section if it has content
            if current_section["content"].strip():
                sections.append(current_section)

            # Create documents from sections
            for i, section in enumerate(sections):
                # Skip sections with very little content (likely noise)
                if len(section["content"]) < 50:
                    continue

                section_metadata = metadata.copy()
                section_metadata["section"] = i + 1
                section_metadata["section_heading"] = section["heading"]

                doc = Document(
                    page_content=f"{section['heading']}\n\n{section['content'].strip()}",
                    metadata=section_metadata
                )
                documents.append(doc)

        # If no sections were created, create a single document with all text
        if not documents:
            # Get all text
            text = soup.get_text(separator='\n\n')

            # Clean up the text (remove excessive whitespace)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            text = '\n\n'.join(lines)

            doc = Document(
                page_content=text,
                metadata=metadata
            )
            documents.append(doc)

        logger.info(f"Successfully processed webpage: {page_url} into {len(documents)} document sections")
        return documents

    except Exception as e:
        logger.error(f"Error processing webpage {page_url}: {str(e)}")
        return None