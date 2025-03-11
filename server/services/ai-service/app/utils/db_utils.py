import os
from pymongo import MongoClient, ASCENDING, TEXT, HASHED
from pymongo.errors import ConnectionFailure, ConfigurationError
import logging
from functools import lru_cache

# Set up logging
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_mongodb_client():
    """
    Creates and returns a MongoDB client using connection details from environment variables.
    Uses LRU cache to avoid creating multiple connections.

    Returns:
        MongoClient: MongoDB client connection

    Raises:
        ConnectionError: If connection to MongoDB fails
    """
    try:
        # Get MongoDB connection details from environment variables
        mongodb_uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")

        # Add authentication if not present in the URI but username/password are set
        if "mongodb://" in mongodb_uri and "@" not in mongodb_uri:
            username = os.environ.get("MONGO_USERNAME", "StudySolution")
            password = os.environ.get("MONGO_PASSWORD", "StudySolution")

            # Parse the URI to add authentication
            protocol_part = mongodb_uri.split("://")[0]
            host_part = mongodb_uri.split("://")[1]

            # Construct authenticated URI
            mongodb_uri = f"{protocol_part}://{username}:{password}@{host_part}"

            # Add authSource if not present
            if "authSource=" not in mongodb_uri:
                if "?" in mongodb_uri:
                    mongodb_uri += "&authSource=admin"
                else:
                    mongodb_uri += "?authSource=admin"

        # Create MongoDB client
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)

        # Extract database name from URI or use default
        if "mongodb://" in mongodb_uri and "/" in mongodb_uri.split("mongodb://")[1]:
            parts = mongodb_uri.split("/")
            # Handle the case where there might be query parameters
            db_name_part = parts[-1].split("?")[0]

            # If db name is empty, use default
            db_name = db_name_part if db_name_part else "ai_service"
        else:
            db_name = "ai_service"

        # Access the database to verify connection
        db = client[db_name]
        client.admin.command('ping')

        logger.info(f"Successfully connected to MongoDB, using database: {db_name}")
        return client

    except (ConnectionFailure, ConfigurationError) as e:
        error_msg = f"Failed to connect to MongoDB: {str(e)}"
        logger.error(error_msg)
        raise ConnectionError(error_msg)


def initialize_database():
    """
    Initializes the MongoDB database structure with required collections and indexes.
    Should be called when the service starts.
    """
    try:
        client = get_mongodb_client()

        # Extract database name from URI
        mongodb_uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
        if "mongodb://" in mongodb_uri and "/" in mongodb_uri.split("mongodb://")[1]:
            parts = mongodb_uri.split("/")
            db_name_part = parts[-1].split("?")[0]
            db_name = db_name_part if db_name_part else "ai_service"
        else:
            db_name = "ai_service"

        db = client[db_name]

        # List of collections to initialize
        collections_to_setup = {
            "documents": [
                ("url", ASCENDING, {"unique": True}),  # URL is unique
                ("title", TEXT, {}),  # For text search on titles
                ("uploaded_at", -1, {})  # For sorting by upload date
            ],
            "summaries": [
                ("user_id", ASCENDING, {}),
                ("document_id", ASCENDING, {}),
                ("type", ASCENDING, {}),  # For filtering by summary type (general/custom)
                ("prompt_used", TEXT, {}),  # For searching within prompts
                ("length", ASCENDING, {}),  # For filtering by length category
                ("created_at", -1, {}),  # For sorting by creation date (newest first)
                ("word_count", ASCENDING, {})  # For filtering by actual word count
            ],
            "flashcards": [
                ("user_id", ASCENDING, {}),
                ("document_id", ASCENDING, {}),
                ("difficulty", ASCENDING, {}),  # For filtering by difficulty
                ("category", ASCENDING, {}),  # For filtering by category
                ("tags", ASCENDING, {}),  # For filtering by tags
                ("created_at", -1, {}),
                ("review_count", ASCENDING, {}),  # For tracking review progress
                ("confidence_level", ASCENDING, {})  # For spaced repetition algorithms
            ],
            "flashcard_sets": [
                ("user_id", ASCENDING, {}),
                ("document_id", ASCENDING, {}),  # Can create compound index if needed
                ("created_at", -1, {}),
                ("flashcard_count", ASCENDING, {})  # For filtering by set size
            ],
            "quizzes": [
                ("user_id", ASCENDING, {}),
                ("document_id", ASCENDING, {})
            ],
            "study_plans": [
                ("user_id", ASCENDING, {})
            ]
        }

        # Get existing collections
        existing_collections = db.list_collection_names()

        # Create collections and indexes
        for collection_name, indexes in collections_to_setup.items():
            # Create collection if it doesn't exist
            if collection_name not in existing_collections:
                db.create_collection(collection_name)
                logger.info(f"Created collection: {collection_name}")

            # Create indexes
            collection = db[collection_name]
            for field, index_type, options in indexes:
                try:
                    if index_type == TEXT:
                        collection.create_index([(field, TEXT)], **options)
                    elif index_type == HASHED:
                        collection.create_index([(field, HASHED)], **options)
                    else:
                        collection.create_index([(field, index_type)], **options)

                    logger.info(f"Created index on {collection_name}.{field}")
                except Exception as e:
                    logger.warning(f"Error creating index on {collection_name}.{field}: {str(e)}")
                    # Continue creating other indexes

            logger.info(f"Set up indexes for collection: {collection_name}")

        logger.info("Database initialization complete")

    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise


def drop_database(confirm=False):
    """
    Drops the entire database. Use with extreme caution!

    Args:
        confirm: Safety flag that must be set to True

    Returns:
        bool: True if successful, False otherwise
    """
    if not confirm:
        logger.warning("Database drop attempted without confirmation")
        return False

    try:
        client = get_mongodb_client()

        # Extract database name from URI
        mongodb_uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
        if "mongodb://" in mongodb_uri and "/" in mongodb_uri.split("mongodb://")[1]:
            parts = mongodb_uri.split("/")
            db_name_part = parts[-1].split("?")[0]
            db_name = db_name_part if db_name_part else "ai_service"
        else:
            db_name = "ai_service"

        client.drop_database(db_name)
        logger.warning(f"Database '{db_name}' has been dropped")
        return True

    except Exception as e:
        logger.error(f"Error dropping database: {str(e)}")
        return False