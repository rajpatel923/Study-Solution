from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import time
import logging
from app.config import Settings, EurekaClient
from app.utils.db_utils import initialize_database
import sys

# Set up logging
logger = logging.getLogger(__name__)

# Import existing routers - use try/except to handle optional components

from app.routes.flashcards import router as flashcards_router
from app.routes.summarizer import router as summarizer_router
from app.routes.test_note import router as test_note_router
from app.routes.voice_assistant import router as voice_assistant_router
from app.routes.web_sockets import router as web_sockets_router

# And add this line after your other app.include_router() calls:





# Initialize settings and Eureka client
settings = Settings()
eureka_client = EurekaClient(settings)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI service for processing PDFs and generating study materials"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(flashcards_router, prefix=settings.API_PREFIX)
app.include_router(summarizer_router, prefix=settings.API_PREFIX)
app.include_router(test_note_router, prefix=settings.API_PREFIX)
app.include_router(voice_assistant_router, prefix=settings.API_PREFIX)
app.include_router(web_sockets_router, prefix=settings.API_PREFIX)




@app.on_event("startup")
async def startup_event():
    """
    Initialize services on startup and register with Eureka.
    """
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENVIRONMENT} environment")

    # Log Eureka registration details
    print(f"Hostname: {eureka_client.hostname}")
    print(f"IP Address: {eureka_client.ip_address}")
    print(f"Port: {eureka_client.port}")
    print(f"Instance ID: {eureka_client.instance_id}")
    print(f"Eureka Server: {eureka_client.eureka_server_url}")

    # Initialize database collections and indexes with error handling
    try:
        initialize_database()
        logger.info("Database initialization complete")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.info("Application will continue running without database initialization")
        # Continue running even if database initialization fails

    # Register with Eureka with retry logic
    try:
        registered = False
        retries = 5
        while not registered and retries > 0:
            registered = eureka_client.register()
            if not registered:
                retries -= 1
                print(f"Registration failed. Retrying in 10 seconds... ({retries} attempts left)")
                time.sleep(10)
    except Exception as e:
        logger.error(f"Error registering with Eureka: {str(e)}")
        logger.info("Application will continue running without Eureka registration")
        # Continue running even if Eureka registration fails

    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Clean up resources and deregister from Eureka on shutdown.
    """
    logger.info(f"Shutting down {settings.APP_NAME} microservice...")
    try:
        eureka_client.deregister()
    except Exception as e:
        logger.error(f"Error deregistering from Eureka: {str(e)}")


@app.get("/")
async def root():
    """
    Root endpoint for API status.
    """
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENVIRONMENT,
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for Eureka and monitoring.
    """
    return {"status": "UP", "service": eureka_client.app_name}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=(settings.APP_ENVIRONMENT == "development")
    )