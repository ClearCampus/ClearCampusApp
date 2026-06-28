from fastapi import FastAPI, Depends, HTTPException, status
from google.cloud import firestore
import firebase_client
from routers import auth

app = FastAPI(
    title="Clear Campus API",
    description="Backend API for Clear Campus club discovery and management platform.",
    version="1.0.0"
)

# Include Routers
app.include_router(auth.router)

@app.get("/health")
def health_check() -> dict:
    """
    General health check endpoint for AWS App Runner or local docker check.
    """
    firebase_status = "initialized" if firebase_client.db is not None else "missing_configuration"
    return {
        "status": "ok",
        "firebase": firebase_status
    }

