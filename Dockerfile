# Stage 1: Build React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install dependencies using npm with legacy-peer-deps for stability
RUN npm install --legacy-peer-deps

# Copy the entire project
COPY . .

# Build the app (Vite outputs to dist/public per vite.config.ts)
RUN npm run build

# Stage 2: Final Python image with Flask and ocrmypdf
FROM python:3.11-slim-bookworm

# Install system dependencies
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

# Copy Python requirements and install (Compatible with Python 3.11)
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask service code
COPY server/ ./server/

# Copy built frontend static files from Stage 1
COPY --from=builder /app/dist ./dist

# Environment variables
EXPOSE 5001
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Run the Flask app
CMD ["python", "server/ocr_service.py"]
