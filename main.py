from fastapi import FastAPI, Depends, HTTPException, status
from google.cloud import firestore
import firebase_client
from auth import get_current_user, verify_tamu_email

app = FastAPI(
    title="Clear Campus API",
    description="Backend API for Clear Campus club discovery and management platform.",
    version="1.0.0"
)

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



@app.post("/api/auth/verify", status_code=status.HTTP_200_OK)
def verify_and_register_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Validates Firebase session, resolves user role (Student vs Club Owner), 
    and handles automatic club claiming if matching the official contact email.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized. Check your credentials configuration."
        )

    uid = current_user.get("uid")
    email = current_user.get("email")

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
        matching_clubs = clubs_ref.where("official_email", "==", email).limit(1).get()
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
            club_data = club_doc.to_dict()
            owner_uids = club_data.get("owner_uids", [])
            
            if uid not in owner_uids:
                owner_uids.append(uid)
                
            club_ref.update({
                "owner_uids": owner_uids,
                "claimed": True
            })
            print(f"Club '{club_doc.id}' claimed successfully by owner UID {uid}.")
        except Exception as e:
            print(f"Failed to update club ownership field: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update club registry with owner link."
            )
            
    elif verify_tamu_email(email):
        # User is a regular TAMU student
        role = "student"
    else:
        # Deny registration if not a TAMU student and not a listed club owner
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
