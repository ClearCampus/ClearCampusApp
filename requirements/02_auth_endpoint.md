# Requirement: Authentication Endpoint

## Goal
Expose a REST API endpoint that validates the client's Firebase Auth state, syncs user records to Firestore, and checks if they require onboarding.

## Specifications

### 1. Endpoint: `/api/auth/verify`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <Firebase_ID_Token>`
- **Request Body**: None or optional client profile metadata.
- **Access Control**: Public (but requires a valid header token).

### 2. Backend Flow
1. Extract and verify the JWT via [01_firebase_auth.md](file:///c:/Users/stoof/ClearCampusProject/ClearCampusApp/requirements/01_firebase_auth.md).
2. Validate that the email is verified in Firebase Auth (recommended).
3. Query the `users` collection in Firestore using the decoded `uid`.
4. **If user does not exist in Firestore**:
   - Verify if the email is a TAMU student email (ends with `@tamu.edu` or `@email.tamu.edu`).
   - Query the `clubs` collection in Firestore to see if any club document has `official_email` matching this user's email.
   - **Role Resolution**:
     - If a club matches: Set the user's role to `owner` and link the club's ID in the user's document (`owned_clubs: [club_id]`). In the club document, add the user's `uid` to the `owner_uids` array and set `claimed: true`.
     - Else if it matches the TAMU domain: Set role to `student` with `owned_clubs: []`.
     - Else: Raise an `HTTPException(status_code=400, detail="Invalid school email or unregistered club email")`.
   - Create a new document in the `users` collection:
     ```json
     {
       "uid": "...",
       "email": "...",
       "role": "student", // or "owner"
       "owned_clubs": [], // or [club_id]
       "onboarded": false,
       "tags": [],
       "created_at": "timestamp"
     }
     ```
5. **If user exists**:
   - Return the user doc including their current role, owned clubs, and onboarding status.

### 3. Response Schema
- **Status Code**: `200 OK` (Existing user or successfully registered).
- **Body**:
  ```json
  {
    "uid": "...",
    "email": "...",
    "role": "student", // or "owner"
    "owned_clubs": [], // or ["cougar-board-game-society"]
    "onboarded": true, // boolean
    "tags": ["social", "music"]
  }
  ```

