import json
import os
import time

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

with open("tamu_clubs.json") as f:
    clubs = json.load(f)


def build_text(club):
    parts = [club.get("name", ""), club.get("description", "")]
    return " | ".join(p.strip() for p in parts if p.strip())


def embed(text):
    response = client.embeddings.create(model="text-embedding-3-small", input=text)
    return response.data[0].embedding


embedded = []
for i, club in enumerate(clubs):
    text = build_text(club)
    vector = embed(text)
    embedded.append(
        {
            "name": club["name"],
            "description": club["description"],
            "url": club["url"],
            "text": text,
            "vector": vector,
        }
    )
    if (i + 1) % 50 == 0:
        print(f"{i + 1}/1389 embedded...")
    time.sleep(0.05)

with open("tamu_clubs_embedded.json", "w") as f:
    json.dump(embedded, f)

print("Done.")
