import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
WORKERS = 20

with open("tamu_clubs.json") as f:
    clubs = json.load(f)


def build_text(club):
    parts = [club.get("name", ""), club.get("description", "")]
    return " | ".join(p.strip() for p in parts if p.strip())


def embed_club(club):
    text = build_text(club)
    response = client.embeddings.create(model="text-embedding-3-small", input=text)
    return {
        "name": club["name"],
        "description": club["description"],
        "url": club["url"],
        "email": club.get("email", "none"),
        "phone": club.get("phone", "none"),
        "text": text,
        "vector": response.data[0].embedding,
    }


total = len(clubs)
embedded = [None] * total
done = 0

with ThreadPoolExecutor(max_workers=WORKERS) as executor:
    futures = {executor.submit(embed_club, club): i for i, club in enumerate(clubs)}
    for future in as_completed(futures):
        i = futures[future]
        embedded[i] = future.result()
        done += 1
        if done % 100 == 0 or done == total:
            print(f"{done}/{total} embedded...")

with open("tamu_clubs_embedded.json", "w") as f:
    json.dump(embedded, f)

print("Done.")
