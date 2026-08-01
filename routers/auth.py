from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore
from google.cloud.firestore import FieldFilter
from pydantic import BaseModel
from typing import Optional
import firebase_client
from auth import get_current_user, verify_tamu_email, OFFLINE_MODE
from routers.clubs import invalidate_clubs_cache

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class VerifyRequest(BaseModel):
    claim_club_id: Optional[str] = None

@router.post("/verify", status_code=status.HTTP_200_OK)
def verify_and_register_user(
    body: Optional[VerifyRequest] = None,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Validates Firebase session, resolves user role (Student vs Club Owner), 
    and handles automatic/manual club claiming during registration.
    """
    uid = current_user.get("uid")
    email = current_user.get("email")

    if OFFLINE_MODE or firebase_client.db is None:
        role = "student"
        owned_clubs = []
        if body and body.claim_club_id:
            role = "owner"
            owned_clubs = [body.claim_club_id]
        return {
            "uid": uid or "mock-uid-12345",
            "email": email or "test-officer@tamu.edu",
            "role": role,
            "owned_clubs": owned_clubs,
            "name": current_user.get("name", "Mock Developer"),
            "created_at": "offline-time"
        }

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email is missing from Firebase auth token payload."
        )

    db = firebase_client.db
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()

    # User already registered
    if user_snap.exists:
        return user_snap.to_dict()

    # Determine user role & handle automatic club claiming
    role = "student"
    owned_clubs = []
    
    # 1. Search for matching official email in clubs collection
    try:
        clubs_ref = db.collection("clubs")
        matching_clubs = clubs_ref.where(filter=FieldFilter("official_email", "==", email)).limit(1).get()
    except Exception as e:
        # Fallback if Firestore collection doesn't exist yet or query fails
        matching_clubs = []
        print(f"Error querying clubs collection: {e}")

    if matching_clubs:
        # User is representing a registered club
        role = "owner"
        club_doc = matching_clubs[0]
        owned_clubs.append(club_doc.id)
        
        try:
            club_ref = clubs_ref.document(club_doc.id)
            club_data = club_doc.to_dict() or {}
            update_payload = {
                "owner_uids": firestore.ArrayUnion([uid]),
                "claimed": True
            }
            if "logo" not in club_data:
                update_payload["logo"] = "/hero.png"
            if "applicationsOpen" not in club_data:
                update_payload["applicationsOpen"] = False
            
            club_ref.update(update_payload)
            invalidate_clubs_cache()
            print(f"Club '{club_doc.id}' claimed successfully by owner UID {uid}.")
        except Exception as e:
            print(f"Failed to update club ownership field: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update club registry with owner link."
            )
            
    # 2. Support manual claim via body payload if not matched automatically
    elif body and body.claim_club_id:
        try:
            clubs_ref = db.collection("clubs")
            club_ref = clubs_ref.document(body.claim_club_id)
            club_snap = club_ref.get()
            if club_snap.exists:
                club_data = club_snap.to_dict() or {}
                if not club_data.get("claimed"):
                    role = "owner"
                    owned_clubs.append(body.claim_club_id)
                    update_payload = {
                        "owner_uids": firestore.ArrayUnion([uid]),
                        "claimed": True
                    }
                    if "logo" not in club_data:
                        update_payload["logo"] = "/hero.png"
                    if "applicationsOpen" not in club_data:
                        update_payload["applicationsOpen"] = False
                    
                    club_ref.update(update_payload)
                    invalidate_clubs_cache()
                    print(f"Club '{body.claim_club_id}' claimed successfully by owner UID {uid} via payload.")
        except Exception as e:
            print(f"Failed to manually claim club: {e}")

    # Fallback to TAMU student email verification if not an owner
    if not owned_clubs:
        if verify_tamu_email(email):
            role = "student"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration denied. Sign up requires a @tamu.edu school email or a registered club contact email."
            )

    # Register user in Firestore
    user_doc = {
        "uid": uid,
        "email": email,
        "role": role,
        "owned_clubs": owned_clubs,
        "onboarded": False,
        "tags": {},
        "created_at": firestore.SERVER_TIMESTAMP
    }

    try:
        user_ref.set(user_doc)
        print(f"Registered new user '{email}' with role '{role}'.")
    except Exception as e:
        print(f"Failed to write user doc in Firestore: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user document in database."
        )

    # Retrieve freshly created document to return server timestamps accurately
    created_snap = user_ref.get()
    return created_snap.to_dict()
