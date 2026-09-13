# backend/Dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends \
    libexpat1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir debugpy # For debugging

# Copy app code (both app/ and classes/)
COPY . .

# Make classes importable
ENV PYTHONPATH=/app

# Expose FastAPI ports
EXPOSE 8000 5678