# Requirement: Firebase Authentication Setup

## Goal
Implement a secure, token-based authentication mechanism using Firebase Authentication on the backend to authenticate users (students and club owners).

## Specifications

### 1. Firebase Admin SDK Initialization
- Initialize the Firebase App on backend start using `firebase-admin`.
- Read service account credentials from the path specified by the `FIREBASE_CREDENTIALS_JSON` environment variable, or fall back to default credentials if deployed on GCP/AWS with roles.
- Example:
  ```python
  import firebase_admin
  from firebase_admin import credentials
  
  if not firebase_admin._apps:
      cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_JSON"))
      firebase_admin.initialize_app(cred)
  ```

### 2. Token Verification Middleware/Dependency
- Provide a reusable FastAPI dependency (e.g., `get_current_user`) that extracts the Firebase ID token from the HTTP `Authorization` header.
- Token format must be `Bearer <JWT_TOKEN>`.
- Decode and verify the JWT signature using `firebase_admin.auth.verify_id_token()`.
- If the token is missing, expired, or invalid, raise an `HTTPException(status_code=401, detail="Unauthorized")`.

### 3. User Payload Context
The decoded token should provide:
- `uid`: The unique user identifier.
- `email`: User's primary email.
- `name` (optional): User's display name.
