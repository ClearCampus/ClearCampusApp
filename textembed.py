import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
WORKERS = 20

with open("tamu_clubs.json") as f:
    clubs = json.load(f)

# Load existing embeddings to avoid re-embedding unchanged clubs
existing_embedded = {}
if os.path.exists("tamu_clubs_embedded.json"):
    with open("tamu_clubs_embedded.json") as f:
        for entry in json.load(f):
            if entry and entry.get("url"):
                existing_embedded[entry["url"]] = entry


def build_text(club):
    parts = [club.get("name", ""), club.get("description", "")]
    return " | ".join(p.strip() for p in parts if p.strip())


def is_changed(club, existing):
    return (
        club.get("name") != existing.get("name")
        or club.get("description") != existing.get("description")
        or club.get("email", "none") != existing.get("email", "none")
        or club.get("phone", "none") != existing.get("phone", "none")
        or club.get("website", "none") != existing.get("website", "none")
    )


def embed_club(club, retries=4, backoff=2):
    text = build_text(club)
    last_exc = None
    for attempt in range(retries):
        try:
            response = client.embeddings.create(model="text-embedding-3-small", input=text)
            return {
                "name": club["name"],
                "description": club["description"],
                "url": club["url"],
                "email": club.get("email", "none"),
                "phone": club.get("phone", "none"),
                "website": club.get("website", "none"),
                "text": text,
                "vector": response.data[0].embedding,
            }
        except Exception as e:
            last_exc = e
            if attempt < retries - 1:
                wait = backoff * (2 ** attempt)
                print(f"  Warning: embedding attempt {attempt + 1} failed for '{club.get('name')}': {e}. Retrying in {wait}s...")
                time.sleep(wait)
    raise RuntimeError(f"Failed to embed '{club.get('name')}' after {retries} attempts: {last_exc}")


# Split into unchanged (reuse) vs new/changed (embed)
to_embed = []
for club in clubs:
    existing = existing_embedded.get(club["url"])
    if existing and not is_changed(club, existing):
        continue
    to_embed.append(club)

print(f"{len(clubs) - len(to_embed)} clubs unchanged (reusing embeddings), {len(to_embed)} new/changed (embedding)...")

# Embed only new/changed clubs
newly_embedded = {}
if to_embed:
    done = 0
    total = len(to_embed)
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(embed_club, club): club["url"] for club in to_embed}
        for future in as_completed(futures):
            url = futures[future]
            newly_embedded[url] = future.result()
            done += 1
            if done % 100 == 0 or done == total:
                print(f"  {done}/{total} embedded...")

# Rebuild full embedded list in original order
embedded = []
for club in clubs:
    url = club["url"]
    if url in newly_embedded:
        embedded.append(newly_embedded[url])
    else:
        embedded.append(existing_embedded[url])

with open("tamu_clubs_embedded.json", "w") as f:
    json.dump(embedded, f)

# Write only new/changed clubs for sync_database to use
with open("tamu_clubs_diff.json", "w") as f:
    json.dump(list(newly_embedded.values()), f)

print(f"Done. {len(newly_embedded)} clubs to sync.")
