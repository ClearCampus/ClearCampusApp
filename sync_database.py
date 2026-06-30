import json
import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from google.cloud import firestore

# Ensure the workspace is in python module path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import firebase_client

load_dotenv()

# Check Firebase initialization
if firebase_client.db is None:
    raise RuntimeError(
        "Firebase Firestore database client is not initialized. "
        "Please check your FIREBASE_CREDENTIALS_JSON setting in your env configuration."
    )

db = firebase_client.db

# Check CLI arguments for rebuild flag
REBUILD = "--rebuild" in sys.argv

# Pinecone configs
pinecone_key = os.getenv("PINECONE_API_KEY")
if not pinecone_key:
    raise RuntimeError("PINECONE_API_KEY is not set")

pc = Pinecone(api_key=pinecone_key)

INDEX_NAME = "tamu-clubs"
DIMS = 1536
METRIC = "cosine"
BATCH_SIZE = 100

def url_to_id(url: str | None) -> str:
    if not url:
        return ""
    return url.rstrip("/").split("/")[-1] or url

def delete_collection(collection_name: str) -> None:
    """
    Clears a Firestore collection in chunks of 400 documents.
    """
    print(f"Clearing Firestore collection '{collection_name}'...")
    collection_ref = db.collection(collection_name)
    docs = list(collection_ref.list_documents())
    
    batch = db.batch()
    count = 0
    total = 0
    for doc in docs:
        batch.delete(doc)
        count += 1
        total += 1
        if count >= 400:
            batch.commit()
            print(f"  Deleted batch of {count} documents from '{collection_name}'...")
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        print(f"  Deleted final batch of {count} documents from '{collection_name}'...")
    print(f"Cleared {total} documents from '{collection_name}'.")

# 1. Initialize Pinecone Index
existing_indexes = [idx.name for idx in pc.list_indexes()]
if INDEX_NAME not in existing_indexes:
    print(f"Creating Pinecone index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=DIMS,
        metric=METRIC,
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(INDEX_NAME).status["ready"]:
        print("Waiting for Pinecone index to be ready...")
        time.sleep(2)
    print("Pinecone index ready.")
else:
    print(f"Pinecone index '{INDEX_NAME}' already exists.")

index = pc.Index(INDEX_NAME)

# 2. Rebuild Handling (Deletions)
if REBUILD:
    print("REBUILD FLAG DETECTED. Rebuilding database from scratch...")
    
    # A. Clear Firestore collections
    delete_collection("clubs")
    delete_collection("club_pages")
    
    # B. Clear Pinecone index
    print(f"Clearing Pinecone index '{INDEX_NAME}'...")
    try:
        index.delete(delete_all=True)
        print("Pinecone index cleared.")
    except Exception as e:
        print(f"Warning: Failed to clear Pinecone index: {e}")

# 3. Load Club Data
print("Loading club data...")
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "tamu_clubs_embedded.json"), encoding="utf-8") as f:
    embedded_clubs = json.load(f)

# Load only new/changed clubs for upsert (produced by textembed.py)
diff_path = os.path.join(base_dir, "tamu_clubs_diff.json")
if os.path.exists(diff_path) and not REBUILD:
    with open(diff_path, encoding="utf-8") as f:
        clubs_to_sync = json.load(f)
    print(f"Incremental mode: {len(clubs_to_sync)} new/changed clubs to sync (out of {len(embedded_clubs)} total).")
else:
    clubs_to_sync = embedded_clubs
    print(f"Full sync mode: upserting all {len(embedded_clubs)} clubs.")

scraped_club_ids = {url_to_id(club["url"]) for club in embedded_clubs}

# 4. Synchronize Firebase Firestore
print("Fetching current clubs from Firestore...")
clubs_collection = db.collection("clubs")
existing_docs = {} if REBUILD else {doc.id: doc.to_dict() or {} for doc in clubs_collection.stream()}
existing_doc_ids = set(existing_docs.keys())

# A. Flag removed clubs for pending deletion (do NOT hard-delete)
PENDING_FILE = os.path.join(base_dir, "pending_deletion.json")
if not REBUILD:
    removed_ids = existing_doc_ids - scraped_club_ids
    if removed_ids:
        # Load existing pending list to avoid duplicates
        if os.path.exists(PENDING_FILE):
            with open(PENDING_FILE) as f:
                pending = json.load(f)
        else:
            pending = []

        already_pending = {entry["id"] for entry in pending}
        newly_removed = removed_ids - already_pending
        flagged_on = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if newly_removed:
            print(f"{len(newly_removed)} clubs newly flagged for pending deletion...")
            for club_id in newly_removed:
                existing_data = existing_docs.get(club_id, {})
                pending.append({
                    "id": club_id,
                    "name": existing_data.get("name", ""),
                    "url": existing_data.get("url", ""),
                    "flagged_on": flagged_on,
                    "status": "pending",
                })
            with open(PENDING_FILE, "w") as f:
                json.dump(pending, f, indent=2)
            print(f"Flagged {len(newly_removed)} clubs in pending_deletion.json (not deleted from DB).")
        else:
            print(f"{len(removed_ids)} clubs already flagged — no new entries.")
    else:
        print("No clubs removed.")

# B. Upsert new/changed clubs only
print(f"Upserting {len(clubs_to_sync)} clubs to Firestore `/clubs` collection...")
firestore_batch = db.batch()
batch_count = 0

for i, club in enumerate(clubs_to_sync):
    club_id = url_to_id(club["url"])
    doc_ref = clubs_collection.document(club_id)
    mapped_email = club.get("email")

    if club_id in existing_doc_ids:
        # Existing document: update scraped details, preserve owner settings
        existing_data = existing_docs[club_id]
        update_data = {
            "id": club_id,
            "name": club["name"],
            "description": club["description"],
            "url": club["url"],
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        # Only overwrite official_email/phone if changed
        if mapped_email and mapped_email != "none" and existing_data.get("official_email") != mapped_email:
            update_data["official_email"] = mapped_email
        mapped_phone = club.get("phone")
        if mapped_phone and mapped_phone != "none" and existing_data.get("phone") != mapped_phone:
            update_data["phone"] = mapped_phone
            
        # Ensure filters block exists
        if "filters" not in existing_data:
            update_data["filters"] = {
                "time_commitment": "medium",
                "meeting_types": [],
                "fee": 0.0,
                "tags": []
            }
            
        firestore_batch.update(doc_ref, update_data)
    else:
        # New document: create with default filters (split layout)
        new_data = {
            "id": club_id,
            "name": club["name"],
            "description": club["description"],
            "url": club["url"],
            "official_email": mapped_email if mapped_email and mapped_email != "none" else None,
            "phone": club.get("phone") if club.get("phone") != "none" else None,
            "claimed": False,
            "owner_uids": [],
            "filters": {
                "time_commitment": "medium",      # default value
                "meeting_types": [],               # select-all list
                "fee": 0.0,                        # numeric fee/dues
                "tags": []                         # vibe/interest tags
            },
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        firestore_batch.set(doc_ref, new_data)
        
    batch_count += 1

    # Firestore batches are capped at 500 writes
    if batch_count >= 400 or (i + 1) == len(clubs_to_sync):
        firestore_batch.commit()
        print(f"  Committed Firestore batch update: {i+1}/{len(embedded_clubs)}")
        firestore_batch = db.batch()
        batch_count = 0

# 5. Synchronize Pinecone Vectors
print(f"Upserting {len(clubs_to_sync)} vectors to Pinecone...")
for i in range(0, len(clubs_to_sync), BATCH_SIZE):
    batch = clubs_to_sync[i : i + BATCH_SIZE]
    vectors = [
        {
            "id": url_to_id(club["url"]),
            "values": club["vector"],
            "metadata": {
                "name": club["name"],
                "description": club["description"],
                "url": club["url"],
                "text": club["text"],
            },
        }
        for club in batch
    ]
    index.upsert(vectors=vectors)
    print(f"  Upserted Pinecone batch: {min(i + BATCH_SIZE, len(clubs_to_sync))}/{len(clubs_to_sync)}")

print("Database synchronization completed successfully.")
