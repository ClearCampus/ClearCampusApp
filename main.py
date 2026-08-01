from fastapi import FastAPI, Depends, HTTPException, status
from google.cloud import firestore
from fastapi.middleware.cors import CORSMiddleware
import firebase_client
from routers import auth, clubs

app = FastAPI(
    title="Clear Campus API",
    description="Backend API for Clear Campus club discovery and management platform.",
    version="1.0.0"
)

# Configure CORS for local development and deployed frontend origins
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://clearcampus-4d5c1.web.app",
    "https://clearcampus-4d5c1.firebaseapp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(clubs.router)


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

