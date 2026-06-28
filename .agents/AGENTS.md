# Local Steering Guidelines (Clear Campus Backend)

This document contains guidelines and constraints for developers and AI agents working on the Clear Campus backend codebase.

## Tech Stack & Architecture

- **Web Framework**: FastAPI (Python)
  - All new endpoints should be built using FastAPI APIRouter.
  - Implement native dependency injection for token verification and database sessions.
- **Authentication**: Firebase Authentication
  - Authenticate clients using Firebase ID tokens (`Authorization: Bearer <token>`).
  - Use `firebase-admin` SDK to decode and verify tokens.
- **Database (Metadata)**: Firebase Firestore
  - Store transactional data (accounts, roles, metadata, applications, attendance, events).
  - Do not store raw high-dimensional vector embeddings in Firestore.
- **Search (Vector)**: Pinecone Index (`tamu-clubs`)
  - Dimension: 1536
  - Embedding model: `text-embedding-3-small` (OpenAI API)
  - Reranking: Pinecone Inference using `bge-reranker-v2-m3`
- **Deployment**: Containerized setup via AWS App Runner.
  - Expose API on port `8000` or configured via `$PORT`.
  - Maintain a multi-stage Dockerfile in the project root.

## Code Guidelines

- **Type Hints**: Use strict type hints for all parameters and return types.
- **Error Handling**: Use FastAPI `HTTPException` with clear error messages.
- **Pinecone Sync**: When updating a club in Firestore, synchronize the update to Pinecone in real-time or catch sync failures gracefully.
