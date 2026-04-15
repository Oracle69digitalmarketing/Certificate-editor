# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
# Use npm since pnpm might not be in the default alpine image
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Final Python image with Flask and ocrmypdf
FROM python:3.11-slim-bookworm

# Install system dependencies required by ocrmypdf and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    wget \
    libgomp1 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask service code
COPY server/ ./server/

# Copy built frontend static files from stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose port for Flask
EXPOSE 5001

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Run the Flask app (which now also serves the frontend)
CMD ["python", "server/ocr_service.py"]
