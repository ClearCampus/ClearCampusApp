# Requirement: Firebase Firestore Database Structure

## Goal
Define the collections, document schemas, and indexing guidelines for Firestore to store transactional app data, student preferences, and club details.

## Collections & Document Schemas

### 1. `users` Collection
Stores student profiles, onboarding details, and roles.
- **Path**: `/users/{uid}` (where `{uid}` is the Firebase Auth UID).
- **Document Structure**:
  ```json
  {
    "uid": "user_uid_12345",
    "email": "student@tamu.edu",
    "role": "student",          // "student" | "owner" | "admin"
    "owned_clubs": [],          // array of strings (club IDs owned by this user)
    "onboarded": true,          // boolean
    "created_at": "timestamp",
    "tags": {                   // optional student onboarding preferences
      "vibe": ["relaxed", "social", "drop-in"],
      "interests": ["music", "art", "board games"],
      "schedule": ["tue_evening", "thu_evening"],
      "cost_preference": "free_only"
    }
  }
  ```

### 2. `clubs` Collection
Stores lightweight metadata for registered or scraped clubs.
- **Path**: `/clubs/{club_id}` (where `{club_id}` matches the Pinecone ID, typically derived from URL).
- **Document Structure**:
  ```json
  {
    "id": "cougar-board-game-society",
    "name": "Cougar Board Game Society",
    "description": "Open hangout every Tue at 7. Settlers, Codenames, whatever the table picks.",
    "url": "https://getinvolved.tamu.edu/organization/cougar-board-game-society",
    "official_email": "boardgames-officer@tamu.edu", // email used for claiming ownership
    "claimed": true,                    // boolean
    "owner_uids": ["owner_uid_98765"], // UIDs of users who can modify this club
    "filters": {
      "time_commitment": "low",          // "low" | "medium" | "high"
      "meeting_types": ["social", "projects"], // Array select-all: e.g., ["projects", "volunteering", "social", "learning_series"]
      "fee": 15.00,                      // Numeric dues/fee
      "tags": ["board-games", "casual", "social"] // General categorization tags
    },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
  ```

### 3. `club_pages` Collection
Stores heavy, customizable content for rendering specific club profile pages.
- **Path**: `/club_pages/{club_id}` (where `{club_id}` matches the corresponding club document ID).
- **Document Structure**:
  ```json
  {
    "club_id": "cougar-board-game-society",
    "banner_image_url": "https://...",  // Optional banner URL
    "custom_sections": [                 // Dynamic, ordered layout blocks for custom page elements
      {
        "id": "faq_section_123",
        "type": "text",                  // "text" | "faq" | "links" | "media"
        "title": "Frequently Asked Questions",
        "content": "No experience needed! We supply all board games at meetings."
      },
      {
        "id": "resource_links",
        "type": "links",
        "title": "Resources & Contacts",
        "links": [
          { "label": "Join our Discord", "url": "https://discord.gg/cougar-games" },
          { "label": "Officer Application Form", "url": "https://forms.gle/..." }
        ]
      }
    ],
    "updated_at": "timestamp"
  }
  ```

## Indexing Requirements
- **Single Field Indexes**: Default indexes on `uid`, `email`, `role`, `id`, `club_id`, and `official_email`.
- **Composite Indexes**: If querying clubs by owner and order by update timestamp, define a composite index on `owner_uids` (array-contains) + `updated_at` (descending).


