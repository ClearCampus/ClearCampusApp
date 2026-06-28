import json
import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

pinecone_key = os.getenv("PINECONE_API_KEY")
if not pinecone_key:
    raise RuntimeError("PINECONE_API_KEY is not set")

pc = Pinecone(api_key=pinecone_key)

INDEX_NAME = "tamu-clubs"
DIMS = 1536
METRIC = "cosine"
BATCH_SIZE = 100
PENDING_FILE = "pending_deletion.json"


def url_to_id(url: str) -> str:
    return url.rstrip("/").split("/")[-1] or url


# Create index if it doesn't exist
existing = [idx.name for idx in pc.list_indexes()]
if INDEX_NAME not in existing:
    print(f"Creating index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=DIMS,
        metric=METRIC,
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(INDEX_NAME).status["ready"]:
        print("Waiting for index to be ready...")
        time.sleep(2)
    print("Index ready.")
else:
    print(f"Index '{INDEX_NAME}' already exists.")

index = pc.Index(INDEX_NAME)

print("Loading embedded clubs...")
with open("tamu_clubs_embedded.json") as f:
    clubs = json.load(f)

# Build map of new club IDs
new_ids = {url_to_id(club["url"]) for club in clubs}

# Find and delete removed clubs
print("Checking for removed clubs...")
existing_ids: set[str] = set()
for id_batch in index.list():
    existing_ids.update(id_batch)

removed = existing_ids - new_ids

# Load existing pending deletions to avoid duplicates
if os.path.exists(PENDING_FILE):
    with open(PENDING_FILE) as f:
        pending = json.load(f)
else:
    pending = []

already_pending = {entry["id"] for entry in pending}

if removed:
    newly_removed = removed - already_pending
    print(f"{len(removed)} clubs no longer in scrape; {len(newly_removed)} newly flagged for deletion.")

    if newly_removed:
        newly_removed_list = list(newly_removed)
        flagged_on = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Fetch metadata from Pinecone so we have name/url for the email step
        for i in range(0, len(newly_removed_list), BATCH_SIZE):
            batch_ids = newly_removed_list[i : i + BATCH_SIZE]
            result = index.fetch(ids=batch_ids)
            for vec_id, vec_data in result.vectors.items():
                meta = vec_data.metadata or {}
                pending.append(
                    {
                        "id": vec_id,
                        "name": meta.get("name", ""),
                        "description": meta.get("description", ""),
                        "url": meta.get("url", ""),
                        "flagged_on": flagged_on,
                        "status": "pending",
                    }
                )

        with open(PENDING_FILE, "w") as f:
            json.dump(pending, f, indent=2)
        print(f"Flagged {len(newly_removed)} clubs in {PENDING_FILE} (kept in index until confirmed).")
    else:
        print("All removed clubs are already flagged — no new entries.")
else:
    print("No clubs removed.")

# Upsert all current clubs
print(f"Upserting {len(clubs)} records in batches of {BATCH_SIZE}...")
for i in range(0, len(clubs), BATCH_SIZE):
    batch = clubs[i : i + BATCH_SIZE]
    vectors = [
        {
            "id": url_to_id(club["url"]),
            "values": club["vector"],
            "metadata": {
                "name": club["name"],
                "description": club["description"],
                "url": club["url"],
                "email": club.get("email", ""),
                "text": club["text"],
            },
        }
        for club in batch
    ]
    index.upsert(vectors=vectors)
    print(f"  Upserted {min(i + BATCH_SIZE, len(clubs))}/{len(clubs)}")

print("Done! Index stats:")
print(index.describe_index_stats())
