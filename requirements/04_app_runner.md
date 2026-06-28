# Requirement: Containerized Backend and AWS App Runner

## Goal
Establish a containerized deployment architecture for the FastAPI backend and configure it to deploy seamlessly via AWS App Runner.

## Specifications

### 1. Dockerfile Configuration
Create a production-grade `Dockerfile` in the root of the workspace.
- **Base Image**: `python:3.11-slim` or `python:3.10-slim` to minimize image size.
- **Structure**:
  ```dockerfile
  # Stage 1: Build & install dependencies
  FROM python:3.11-slim as builder
  WORKDIR /app
  RUN apt-get update && apt-get install -y --no-install-recommends build-essential
  COPY requirements.txt .
  RUN pip install --no-cache-dir --user -r requirements.txt

  # Stage 2: Runtime image
  FROM python:3.11-slim as runner
  WORKDIR /app
  COPY --from=builder /root/.local /root/.local
  COPY . .
  ENV PATH=/root/.local/bin:$PATH
  EXPOSE 8000
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```

### 2. AWS App Runner Requirements
App Runner reads the container configuration from a custom config or AWS Console parameters:
- **Port Routing**: Route requests to port `8000` (or dynamic `$PORT` environment variable).
- **Environment Variables**:
  - `OPENAI_API_KEY`: For generating query/description embeddings.
  - `PINECONE_API_KEY`: For interacting with Pinecone indices.
  - `FIREBASE_CREDENTIALS_JSON`: Path or serialized string of service account keys.
- **Health Check Path**: `/health` or `/api/health` returning `{"status": "ok"}` with a `200` status code.
- **CPU & Memory**: Minimum 1 vCPU and 2 GB RAM (sufficient for FastAPI app hosting).

### 3. Local Development vs. Production Environments
- **Local Development**:
  - Environment variables should be defined locally in a `.env` file (copied from [`.env.example`](../.env.example) and excluded from Git).
  - The application uses `python-dotenv` to load these local environment variables on startup.
- **Production (AWS App Runner / Docker)**:
  - Environment variables are injected at runtime by the container orchestrator / AWS App Runner configuration. 
  - Standard containerization practices apply; the `.env` file must NOT be packaged inside the Docker image (excluded via `.dockerignore`).

