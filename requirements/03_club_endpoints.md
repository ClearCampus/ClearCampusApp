# Requirement: Club Creation and Modification Endpoints

## Goal
Provide secure REST API endpoints for club owners to create, update, or delete club profiles, and keep the vector search database (Pinecone) synchronized in real-time.

## Specifications

### 1. Authorization
- These endpoints require a verified user token where the user's role in Firestore is `owner`.
- The user must be the designated owner of the club to perform updates or deletions.

### 2. Endpoints

#### A. Create Club
- **Method**: `POST`
- **Route**: `/api/clubs`
- **Request Body**:
  ```json
  {
    "name": "...",
    "description": "...",
    "url": "..."
  }
  ```
- **Execution Flow**:
  1. Add record to the `clubs` collection in Firestore, generating a unique `club_id`. Assign the requesting user's `uid` as the owner.
  2. Format the search text as `"{name} | {description}"`.
  3. Generate a 1536-dim vector embedding using OpenAI's `text-embedding-3-small` (similar to [textembed.py](../textembed.py)).
  4. Upsert the vector to the `tamu-clubs` Pinecone index with the `club_id` as the vector ID.
- **Response**: `201 Created` with the new club object.

#### B. Update Club
- **Method**: `PUT`
- **Route**: `/api/clubs/{club_id}`
- **Request Body**: Modified club fields (`name`, `description`, etc.)
- **Execution Flow**:
  1. Confirm the requesting user's `uid` matches the owner of the club in Firestore.
  2. Update the club document in Firestore.
  3. Recompute search text, re-generate embedding via OpenAI, and upsert the updated vector and metadata to Pinecone.
- **Response**: `200 OK` with the updated club object.

#### C. Delete Club
- **Method**: `DELETE`
- **Route**: `/api/clubs/{club_id}`
- **Execution Flow**:
  1. Confirm ownership in Firestore.
  2. Delete the club document in Firestore.
  3. Call Pinecone `index.delete(ids=[club_id])` to remove the embedding vector (similar to [upsert_pinecone.py](../upsert_pinecone.py)).
- **Response**: `204 No Content`.

### 3. Performance & Cost Considerations
- **Cost**: The OpenAI `text-embedding-3-small` model costs **$0.02 per 1,000,000 tokens**. A typical club metadata string (name + description) averages ~100–200 tokens, which costs roughly **$0.000003** per update. This is economically negligible for real-time operations.
- **Latency**: Generating an embedding via the OpenAI REST API typically takes between **100ms to 250ms**. Performing this synchronously during a `POST` or `PUT` request is fast enough for interactive use and ensures instant vector search consistency.

