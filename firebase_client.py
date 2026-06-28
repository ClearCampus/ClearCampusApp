import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

# Global clients placeholder
db = None
auth_client = None

def initialize_firebase() -> None:
    global db, auth_client
    
    if firebase_admin._apps:
        # Already initialized
        db = firestore.client()
        return
        
    cred_env = os.getenv("FIREBASE_CREDENTIALS_JSON")
    
    if not cred_env:
        # If no explicit credentials, try default environment credentials
        # (This works if running on Google Cloud, or in testing environments)
        print("WARNING: FIREBASE_CREDENTIALS_JSON is not set. Attempting default credentials...")
        try:
            firebase_admin.initialize_app()
            print("Firebase initialized with default credentials.")
        except Exception as e:
            print(f"Failed to initialize Firebase with default credentials: {e}")
            print("Please configure FIREBASE_CREDENTIALS_JSON in your .env file.")
            # Do not raise error immediately to allow running server health checks locally
            return
    else:
        try:
            # Check if it's a file path or direct JSON contents
            if os.path.exists(cred_env):
                cred = credentials.Certificate(cred_env)
            else:
                # Try parsing as inline JSON string (useful for deployment environments)
                try:
                    cred_dict = json.loads(cred_env)
                    cred = credentials.Certificate(cred_dict)
                except json.JSONDecodeError:
                    raise FileNotFoundError(f"Credentials file path '{cred_env}' does not exist and is not valid JSON.")
            
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully from credentials configuration.")
        except Exception as e:
            print(f"Firebase initialization failed: {e}")
            raise e

    # Initialize Firestore Client
    try:
        db = firestore.client()
    except Exception as e:
        print(f"Firestore client initialization failed: {e}")
        print("Backend will start but Firebase features will be unavailable.")
        db = None

# Initialize on import
try:
    initialize_firebase()
except Exception as e:
    print(f"Warning: firebase_client import initialization failed: {e}")

