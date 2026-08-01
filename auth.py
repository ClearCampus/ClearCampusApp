import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import firebase_client

OFFLINE_MODE = os.getenv("OFFLINE_MODE", "false").lower() == "true"

# Define the HTTPBearer security scheme
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to extract and verify the Firebase ID token from the Authorization header.
    Expects format: Authorization: Bearer <token>
    """
    if OFFLINE_MODE:
        return {
            "uid": "mock-uid-12345",
            "email": "test-officer@tamu.edu",
            "name": "Mock Developer"
        }

    token = credentials.credentials
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase service is unconfigured or unavailable.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        # Verify the ID token using Firebase Admin SDK
        # This checks the signature, expiration, and project matching
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_owner(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency to verify that the current user has the 'owner' or 'admin' role in Firestore.
    """
    if OFFLINE_MODE:
        return {
            "uid": current_user.get("uid", "mock-uid-12345"),
            "email": current_user.get("email", "test-officer@tamu.edu"),
            "name": "Mock Developer",
            "role": "owner",
            "owned_clubs": ["chess-club"]
        }

    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )
    uid = current_user.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User UID not found in auth token context."
        )
    
    db = firebase_client.db
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()
    
    if not user_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User profile does not exist in database."
        )
        
    user_data = user_snap.to_dict()
    if not user_data or user_data.get("role") not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Owner privileges required."
        )
        
    return user_data


def verify_tamu_email(email: str) -> bool:
    """
    Validates if an email belongs to the TAMU student domains.
    """
    email_lower = email.lower()
    return email_lower.endswith(("@tamu.edu", "@email.tamu.edu"))

