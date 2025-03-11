FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY .env* .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV APP_NAME=python-ai-service
# The Eureka server URL will be set at runtime via docker-compose or deployment config

# Expose port for the application
EXPOSE 8098

# Run the FastAPI application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8098"]