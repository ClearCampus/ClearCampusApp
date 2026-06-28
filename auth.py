from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import firebase_client

# Define the HTTPBearer security scheme
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to extract and verify the Firebase ID token from the Authorization header.
    Expects format: Authorization: Bearer <token>
    """
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


def verify_tamu_email(email: str) -> bool:
    """
    Validates if an email belongs to the TAMU student domains.
    """
    email_lower = email.lower()
    return email_lower.endswith(("@tamu.edu", "@email.tamu.edu"))
