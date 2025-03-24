import os
import tempfile
import logging
from urllib.parse import urlparse, parse_qs
from typing import List, Optional, Dict, Any
from langchain.schema import Document
import googleapiclient.discovery
import googleapiclient.errors
import isodate
import whisper
import torch
import requests
from dotenv import load_dotenv
import json
import time

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

# Configure whisper model (can be set via env variable)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # Options: tiny, base, small, medium, large

# YouTube API settings
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"


def extract_video_id(youtube_url: str) -> Optional[str]:
    """
    Extracts the YouTube video ID from various URL formats

    Args:
        youtube_url: YouTube URL in any standard format

    Returns:
        str: YouTube video ID or None if extraction fails
    """
    try:
        parsed_url = urlparse(youtube_url)

        # Handle standard youtube.com URLs
        if parsed_url.netloc in ['youtube.com', 'www.youtube.com']:
            if parsed_url.path == '/watch':
                return parse_qs(parsed_url.query)['v'][0]
            elif parsed_url.path.startswith('/embed/'):
                return parsed_url.path.split('/')[2]
            elif parsed_url.path.startswith('/v/'):
                return parsed_url.path.split('/')[2]

        # Handle youtu.be short URLs
        elif parsed_url.netloc == 'youtu.be':
            return parsed_url.path[1:]

        logger.error(f"Could not extract video ID from URL: {youtube_url}")
        return None

    except Exception as e:
        logger.error(f"Error extracting video ID from URL {youtube_url}: {str(e)}")
        return None


def get_youtube_client():
    """
    Creates and returns a YouTube API client

    Returns:
        Resource: YouTube API client resource
    """
    try:
        if not YOUTUBE_API_KEY:
            logger.error("YouTube API key not found in environment variables")
            return None

        youtube = googleapiclient.discovery.build(
            YOUTUBE_API_SERVICE_NAME,
            YOUTUBE_API_VERSION,
            developerKey=YOUTUBE_API_KEY,
            cache_discovery=False
        )
        return youtube
    except Exception as e:
        logger.error(f"Error creating YouTube API client: {str(e)}")
        return None


def get_video_info(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves metadata information about a YouTube video using the Data API

    Args:
        video_id: YouTube video ID

    Returns:
        Dict: Dictionary containing video metadata or None if retrieval fails
    """
    try:
        youtube = get_youtube_client()
        if not youtube:
            return None

        # Request video details
        request = youtube.videos().list(
            part="snippet,contentDetails,statistics",
            id=video_id
        )
        response = request.execute()

        # Check if video exists
        if not response.get("items"):
            logger.error(f"Video not found for ID: {video_id}")
            return None

        video_data = response["items"][0]
        snippet = video_data.get("snippet", {})
        content_details = video_data.get("contentDetails", {})
        statistics = video_data.get("statistics", {})

        # Get duration in seconds
        duration_iso = content_details.get("duration", "PT0S")  # Default to 0 seconds
        duration_seconds = int(isodate.parse_duration(duration_iso).total_seconds())

        # Format the video info
        video_info = {
            "title": snippet.get("title", "Unknown Title"),
            "description": snippet.get("description", ""),
            "length_seconds": duration_seconds,
            "author": snippet.get("channelTitle", "Unknown Author"),
            "publish_date": snippet.get("publishedAt"),
            "views": int(statistics.get("viewCount", 0)),
            "likes": int(statistics.get("likeCount", 0)),
            "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url"),
            "video_id": video_id,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "tags": snippet.get("tags", [])
        }

        logger.info(f"Successfully retrieved metadata for video: {video_info['title']}")
        return video_info

    except googleapiclient.errors.HttpError as e:
        error_details = json.loads(e.content.decode("utf-8"))
        logger.error(f"YouTube API HTTP error: {error_details.get('error', {}).get('message', str(e))}")
        return None
    except Exception as e:
        logger.error(f"Error retrieving video info for {video_id}: {str(e)}")
        return None


def get_video_transcript(video_id: str) -> Optional[str]:
    """
    Attempts to get transcript using YouTube Transcript API

    Args:
        video_id: YouTube video ID

    Returns:
        str: Transcript text or None if not available
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            if not transcript_list:
                return None

            # Combine all transcript chunks
            full_transcript = ""
            for chunk in transcript_list:
                if 'text' in chunk:
                    full_transcript += chunk['text'] + " "

            return full_transcript.strip()
        except (TranscriptsDisabled, NoTranscriptFound):
            logger.warning(f"No transcript available for video {video_id}")
            return None

    except ImportError:
        logger.warning("youtube_transcript_api not installed, can't fetch transcript")
        return None
    except Exception as e:
        logger.error(f"Error getting transcript for {video_id}: {str(e)}")
        return None


def download_audio(video_id: str) -> Optional[str]:
    """
    Downloads the audio track from a YouTube video using youtube-dl or yt-dlp

    Args:
        video_id: YouTube video ID

    Returns:
        str: Path to the downloaded audio file or None if download fails
    """
    try:
        # Create a temporary directory for the audio file
        temp_dir = tempfile.mkdtemp()
        audio_path = os.path.join(temp_dir, f"{video_id}_audio.mp3")

        # Try using yt-dlp first (more modern)
        try:
            import yt_dlp

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            if os.path.exists(audio_path):
                logger.info(f"Successfully downloaded audio for video ID: {video_id} using yt-dlp")
                return audio_path

        except ImportError:
            logger.warning("yt-dlp not installed, trying youtube-dl...")
        except Exception as e:
            logger.warning(f"yt-dlp download failed: {str(e)}, trying youtube-dl...")

        # Fallback to youtube-dl
        try:
            import youtube_dl

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_path,
                'quiet': True,
                'no_warnings': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }

            with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            if os.path.exists(audio_path):
                logger.info(f"Successfully downloaded audio for video ID: {video_id} using youtube-dl")
                return audio_path

        except ImportError:
            logger.warning("Neither yt-dlp nor youtube-dl is installed")
        except Exception as e:
            logger.warning(f"youtube-dl download failed: {str(e)}")

        # Final fallback - try a simple HTTP download of the audio
        try:
            # This is a very simplified approach and won't work for most YouTube videos
            # It's just a last resort attempt
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            logger.warning(f"Attempting direct audio download (unlikely to work) for {youtube_url}")

            # This is just a placeholder - a proper implementation would require
            # significantly more complex code to extract the audio URL
            return None

        except Exception as e:
            logger.error(f"All download methods failed for {video_id}: {str(e)}")
            return None

    except Exception as e:
        logger.error(f"Error setting up audio download for {video_id}: {str(e)}")
        # Clean up temp directory if it exists
        if 'temp_dir' in locals():
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except:
                pass
        return None


def transcribe_audio(audio_path: str) -> Optional[Dict[str, Any]]:
    """
    Transcribes the audio file using Whisper

    Args:
        audio_path: Path to the audio file

    Returns:
        Dict: Dictionary containing the transcription or None if transcription fails
    """
    try:
        # Load the Whisper model
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = whisper.load_model(WHISPER_MODEL_SIZE, device=device)

        # Transcribe the audio
        result = model.transcribe(audio_path)

        # Clean up the audio file
        os.remove(audio_path)
        os.rmdir(os.path.dirname(audio_path))

        logger.info(f"Successfully transcribed audio file: {audio_path}")
        return result

    except Exception as e:
        logger.error(f"Error transcribing audio file {audio_path}: {str(e)}")
        # Try to clean up the audio file
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
                os.rmdir(os.path.dirname(audio_path))
        except:
            pass
        return None


def load_youtube_content(youtube_url: str) -> Optional[List[Document]]:
    """
    Processes a YouTube video: gets metadata and transcript,
    and returns the content as Document objects for LangChain

    Args:
        youtube_url: YouTube URL in any standard format

    Returns:
        List[Document]: List of Document objects or None if processing fails
    """
    try:
        # Extract video ID
        video_id = extract_video_id(youtube_url)
        if not video_id:
            logger.error(f"Invalid YouTube URL format: {youtube_url}")

            # Create a fallback document explaining the issue
            doc = Document(
                page_content=f"Unable to process YouTube URL: {youtube_url}. The URL format is not recognized as a valid YouTube video URL.",
                metadata={
                    "source": youtube_url,
                    "error": "Invalid YouTube URL format",
                    "type": "youtube_error"
                }
            )
            return [doc]

        # Get video metadata
        video_info = get_video_info(video_id)
        if not video_info:
            logger.error(f"Failed to retrieve video info for {video_id}")

            # Create a fallback document explaining the issue
            doc = Document(
                page_content=f"This is a YouTube video but metadata could not be retrieved. The video might be private, age-restricted, or unavailable in your region.",
                metadata={
                    "source": youtube_url,
                    "video_id": video_id,
                    "error": "Failed to retrieve metadata",
                    "type": "youtube_error"
                }
            )
            return [doc]

        # Try to get transcript from YouTube API
        transcript = get_video_transcript(video_id)

        # If transcript is available, use it directly
        if transcript:
            logger.info(f"Using available transcript for video {video_id}")

            # Create Document objects from transcript
            # For longer transcripts, split into approximately 10-minute segments
            documents = []
            transcript_length = len(transcript)

            # Simple splitting by character count as a rough approximation
            if transcript_length > 15000:  # If longer than ~15k characters, split it
                # Split into roughly equal parts, aim for ~10 minute segments
                avg_chars_per_minute = 750  # Rough estimate for English speech
                chars_per_segment = avg_chars_per_minute * 10

                segment_count = max(1, transcript_length // chars_per_segment)
                segment_size = transcript_length // segment_count

                for i in range(segment_count):
                    start = i * segment_size
                    end = min((i + 1) * segment_size, transcript_length)

                    segment_text = transcript[start:end]

                    doc = Document(
                        page_content=segment_text,
                        metadata={
                            "source": youtube_url,
                            "title": video_info["title"],
                            "segment": i + 1,
                            "video_id": video_id,
                            "type": "youtube_transcript"
                        }
                    )
                    documents.append(doc)
            else:
                # Short transcript, use it as is
                doc = Document(
                    page_content=transcript,
                    metadata={
                        "source": youtube_url,
                        "title": video_info["title"],
                        "video_id": video_id,
                        "type": "youtube_transcript"
                    }
                )
                documents.append(doc)

            # Add the video description as an additional document
            if video_info["description"] and len(video_info["description"]) > 100:
                doc = Document(
                    page_content=video_info["description"],
                    metadata={
                        "source": youtube_url,
                        "title": video_info["title"],
                        "video_id": video_id,
                        "type": "youtube_description"
                    }
                )
                documents.append(doc)

            logger.info(
                f"Successfully processed YouTube video using transcript: {video_info['title']} into {len(documents)} document chunks")
            return documents

        # No transcript available, try downloading and transcribing audio
        logger.info(f"No transcript available for {video_id}, attempting to download and transcribe audio")

        # Download the audio
        audio_path = download_audio(video_id)
        if not audio_path:
            logger.error(f"Failed to download audio for {video_id}")

            # Create a fallback document with just the metadata
            title = video_info.get("title", "Unknown Title")
            author = video_info.get("author", "Unknown Author")
            description = video_info.get("description", "")

            doc = Document(
                page_content=f"Title: {title}\nAuthor: {author}\n\nDescription:\n{description}\n\nNote: Audio could not be downloaded for transcription. This summary is based only on the video metadata.",
                metadata={
                    "source": youtube_url,
                    "title": title,
                    "author": author,
                    "video_id": video_id,
                    "error": "Failed to download audio",
                    "type": "youtube_metadata_only"
                }
            )
            return [doc]

        # Transcribe the audio
        transcription = transcribe_audio(audio_path)
        if not transcription:
            logger.error(f"Failed to transcribe audio for {video_id}")

            # Create a fallback document with just the metadata
            title = video_info.get("title", "Unknown Title")
            author = video_info.get("author", "Unknown Author")
            description = video_info.get("description", "")

            doc = Document(
                page_content=f"Title: {title}\nAuthor: {author}\n\nDescription:\n{description}\n\nNote: The audio was downloaded but could not be transcribed. This summary is based only on the video metadata.",
                metadata={
                    "source": youtube_url,
                    "title": title,
                    "author": author,
                    "video_id": video_id,
                    "error": "Failed to transcribe audio",
                    "type": "youtube_metadata_only"
                }
            )
            return [doc]

        # Create Document objects
        # We'll split the transcription into approximately 10-minute segments
        # based on the timestamps provided by Whisper
        documents = []

        # If transcription has segments, use them for better chunking
        if "segments" in transcription:
            # Group segments into chunks of about 10 minutes (600 seconds)
            current_chunk = ""
            current_start_time = 0
            segment_count = 0

            for i, segment in enumerate(transcription["segments"]):
                segment_text = segment["text"]
                start_time = segment["start"]

                # Start a new chunk if:
                # - this is the first segment
                # - or we've reached the 10-minute mark
                # - or accumulated more than 20 segments
                if i == 0 or start_time - current_start_time > 600 or segment_count >= 20:
                    if current_chunk:  # Save the previous chunk if it exists
                        doc = Document(
                            page_content=current_chunk.strip(),
                            metadata={
                                "source": youtube_url,
                                "title": video_info["title"],
                                "start_time": current_start_time,
                                "video_id": video_id,
                                "type": "youtube_transcript"
                            }
                        )
                        documents.append(doc)

                    # Start a new chunk
                    current_chunk = segment_text
                    current_start_time = start_time
                    segment_count = 1
                else:
                    # Add to the current chunk
                    current_chunk += " " + segment_text
                    segment_count += 1

            # Add the last chunk if it exists
            if current_chunk:
                doc = Document(
                    page_content=current_chunk.strip(),
                    metadata={
                        "source": youtube_url,
                        "title": video_info["title"],
                        "start_time": current_start_time,
                        "video_id": video_id,
                        "type": "youtube_transcript"
                    }
                )
                documents.append(doc)
        else:
            # If no segments, use the full text
            doc = Document(
                page_content=transcription["text"],
                metadata={
                    "source": youtube_url,
                    "title": video_info["title"],
                    "video_id": video_id,
                    "type": "youtube_transcript"
                }
            )
            documents.append(doc)

        # Add the video description as an additional document
        if video_info["description"] and len(video_info["description"]) > 100:
            doc = Document(
                page_content=video_info["description"],
                metadata={
                    "source": youtube_url,
                    "title": video_info["title"],
                    "video_id": video_id,
                    "type": "youtube_description"
                }
            )
            documents.append(doc)

        logger.info(
            f"Successfully processed YouTube video: {video_info['title']} into {len(documents)} document chunks")
        return documents

    except Exception as e:
        logger.error(f"Error processing YouTube video {youtube_url}: {str(e)}")
        # Create a minimal document with error information
        doc = Document(
            page_content=f"An error occurred while processing this YouTube video: {str(e)}",
            metadata={
                "source": youtube_url,
                "error": str(e),
                "type": "youtube_error"
            }
        )
        return [doc]


def is_youtube_url(url: str) -> bool:
    """
    Determines if a URL is a valid YouTube URL

    Args:
        url: URL to check

    Returns:
        bool: True if the URL is a valid YouTube URL, False otherwise
    """
    try:
        parsed_url = urlparse(url)
        return parsed_url.netloc in ['youtube.com', 'www.youtube.com', 'youtu.be'] and extract_video_id(url) is not None
    except:
        return False