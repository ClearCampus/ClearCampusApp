import json
import os
import time

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = "tamu-clubs"
DIMS = 1536
METRIC = "cosine"
BATCH_SIZE = 100

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

print(f"Upserting {len(clubs)} records in batches of {BATCH_SIZE}...")
for i in range(0, len(clubs), BATCH_SIZE):
    batch = clubs[i : i + BATCH_SIZE]
    vectors = [
        {
            "id": f"club-{i + j}",
            "values": club["vector"],
            "metadata": {
                "name": club["name"],
                "description": club["description"],
                "url": club["url"],
                "text": club["text"],
            },
        }
        for j, club in enumerate(batch)
    ]
    index.upsert(vectors=vectors)
    print(f"  Upserted {min(i + BATCH_SIZE, len(clubs))}/{len(clubs)}")

print("Done! Index stats:")
print(index.describe_index_stats())
