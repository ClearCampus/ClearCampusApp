"""
Search quality benchmark — measures top-5 hit rate with and without the reranker.

Usage:
    python benchmark_search.py

Requires PINECONE_API_KEY and OPENAI_API_KEY in your .env (same as the other scripts).
Hits the API directly, so the live Cloud Run deployment must be reachable.
"""

import json
import os
import sys
import time
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone

load_dotenv()

# ── Config ───────────────────────────────────────────────────────────────────

EMBEDDED_FILE = "tamu_clubs_embedded.json"
RERANK_MODEL = "bge-reranker-v2-m3"
RERANK_THRESHOLD = 0.28

# ── Test cases ───────────────────────────────────────────────────────────────
# Each entry: (query, [list of club-name substrings that must appear in top 5])
# Substring match is case-insensitive; any one of the listed names counts as a hit.

TEST_CASES = [
    # Exact name keywords
    ("solar car racing",        ["Solar Car"]),
    ("sports car club",         ["Sports Car"]),
    ("robotics",                ["Robotics", "Robot"]),
    ("pre-med",                 ["Pre-Med", "Premed", "Pre Med"]),
    ("nursing students",        ["Nursing"]),
    ("accounting",              ["Accounting"]),
    ("debate",                  ["Debate"]),
    ("photography",             ["Photography", "Photo"]),
    ("chess",                   ["Chess"]),
    ("volleyball",              ["Volleyball"]),
    ("basketball",              ["Basketball"]),
    ("martial arts",            ["Martial Arts", "Karate", "Judo", "Taekwondo", "Jiu"]),
    ("swimming",                ["Swimming", "Swim"]),
    ("cycling",                 ["Cycling", "Bike", "Bicycle"]),
    ("fishing",                 ["Fishing", "Fish"]),
    ("hiking outdoors",         ["Hiking", "Outdoor", "Trail"]),
    ("gaming video games",      ["Gaming", "Game", "Esport"]),
    ("cooking food",            ["Culinary", "Cooking", "Food", "Chef"]),
    # Cultural / identity
    ("hispanic latino students",["Hispanic", "Latino", "SHPE", "MAES"]),
    ("indian culture",          ["Indian", "Hindu", "South Asian", "Desi"]),
    ("chinese students",        ["Chinese", "China"]),
    ("black students",          ["Black", "African American", "NAACP", "NSBE"]),
    ("jewish students",         ["Jewish", "Hillel"]),
    ("christian fellowship",    ["Christian", "Fellowship", "Faith", "Chapel"]),
    ("muslim students",         ["Muslim", "Islamic", "MSA"]),
    # Professional / career
    ("consulting club",         ["Consulting"]),
    ("finance investing",       ["Finance", "Investment", "Invest"]),
    ("law pre-law",             ["Law", "Legal", "Pre-Law"]),
    ("entrepreneurship startup",["Entrepreneurship", "Entrepreneur", "Startup"]),
    ("data science machine learning", ["Data Science", "Machine Learning", "AI", "Analytics"]),
    # Service / social
    ("community service volunteering", ["Service", "Volunteer", "Community"]),
    ("tutoring academic help",  ["Tutor", "Academic"]),
    ("mental health wellness",  ["Mental Health", "Wellness", "Counseling"]),
    # Natural language / semantic
    ("clubs that look good for med school", ["Pre-Med", "Premed", "Medicine", "Health", "Biomedical"]),
    ("meet people and make friends",        ["Social", "Community", "Welcome", "Friendship"]),
    ("build things with your hands",        ["Engineering", "Maker", "Build", "Design", "Mechanical"]),
    ("clubs for freshmen to get involved",  ["Freshman", "First Year", "Welcome", "Aggie"]),
    ("environmental sustainability",        ["Environment", "Sustainability", "Green", "Ecology"]),
    ("music band performance",              ["Music", "Band", "Orchestra", "Jazz", "Choir"]),
    ("art drawing creative",               ["Art", "Drawing", "Creative", "Design"]),
    ("theatre acting",                     ["Theatre", "Theater", "Acting", "Drama"]),
]

# ── Load data & clients ───────────────────────────────────────────────────────

pinecone_key = os.getenv("PINECONE_API_KEY")
openai_key   = os.getenv("OPENAI_API_KEY")

if not pinecone_key or not openai_key:
    print("ERROR: PINECONE_API_KEY and OPENAI_API_KEY must be set in .env")
    sys.exit(1)

pc            = Pinecone(api_key=pinecone_key)
openai_client = OpenAI(api_key=openai_key)
index         = pc.Index("tamu-clubs")

print(f"Loading {EMBEDDED_FILE}...")
with open(EMBEDDED_FILE, encoding="utf-8") as f:
    embedded_clubs = json.load(f)
print(f"  {len(embedded_clubs)} clubs loaded.\n")

# ── Helpers ───────────────────────────────────────────────────────────────────

def url_to_id(url):
    if not url:
        return ""
    return url.rstrip("/").split("/")[-1] or url

def hit(name: str, expected: list[str]) -> bool:
    name_lower = name.lower()
    return any(e.lower() in name_lower for e in expected)

def embed(text: str) -> list[float]:
    resp = openai_client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding

def vector_only_top5(vec: list[float]) -> list[str]:
    """Top-5 names from raw Pinecone vector search (no reranker)."""
    res = index.query(vector=vec, top_k=5, include_metadata=True)
    return [m.metadata.get("name", "") for m in res.matches if m.metadata]

def hybrid_top5(query: str, vec: list[float]) -> list[str]:
    """Top-5 names with keyword injection + reranker (mirrors routers/clubs.py logic)."""
    fetch_k = max(150, 5 * 20)
    res = index.query(vector=vec, top_k=fetch_k, include_metadata=True)

    pinecone_ids = set()
    matches      = []
    match_texts  = []

    for m in res.matches:
        meta = m.metadata
        if not meta:
            continue
        club_id = url_to_id(meta.get("url", "")) or meta.get("name", "").lower().replace(" ", "-")
        pinecone_ids.add(club_id)
        matches.append(meta.get("name", ""))
        match_texts.append(meta.get("text") or f"{meta.get('name','')} | {meta.get('description','')}")

    # Keyword injection
    query_tokens = [t.lower() for t in query.split() if len(t) > 1]
    if query_tokens:
        for c in embedded_clubs:
            club_id = url_to_id(c.get("url", "")) or c.get("name", "").lower().replace(" ", "-")
            if club_id in pinecone_ids:
                continue
            name_words = c.get("name", "").lower().split()
            def name_matches(q_token, nw):
                return any(w.startswith(q_token) or q_token.startswith(w) for w in nw)
            if any(name_matches(tok, name_words) for tok in query_tokens):
                matches.append(c.get("name", ""))
                match_texts.append(c.get("text") or f"{c.get('name','')} | {c.get('description','')}")

    if not match_texts:
        return matches[:5]

    reranked = pc.inference.rerank(
        model=RERANK_MODEL,
        query=query,
        documents=match_texts[:100],
        top_n=5,
        return_documents=True,
    )
    result = []
    for item in reranked.data:
        if item.index is None:
            continue
        result.append(matches[item.index])
    return result

# ── Run benchmark ─────────────────────────────────────────────────────────────

print(f"Running {len(TEST_CASES)} queries...\n")
print(f"{'Query':<45} {'Vector':^6} {'Hybrid':^6}  Top-5 (hybrid)")
print("-" * 110)

vector_hits = 0
hybrid_hits = 0
misses      = []

for query, expected in TEST_CASES:
    vec   = embed(query)
    v_top = vector_only_top5(vec)
    h_top = hybrid_top5(query, vec)

    v_hit = any(hit(n, expected) for n in v_top)
    h_hit = any(hit(n, expected) for n in h_top)

    if v_hit:
        vector_hits += 1
    if h_hit:
        hybrid_hits += 1
    else:
        misses.append((query, expected, h_top))

    v_mark = "Y" if v_hit else "N"
    h_mark = "Y" if h_hit else "N"
    top5_str = ", ".join(h_top[:3]) or "(no results)"
    print(f"  {query:<43} {v_mark:^6} {h_mark:^6}  {top5_str}")

    time.sleep(0.2)  # avoid rate-limiting

n = len(TEST_CASES)
print()
print("=" * 110)
print(f"  Vector-only top-5 hit rate : {vector_hits}/{n}  ({100*vector_hits/n:.0f}%)")
print(f"  Hybrid+reranker top-5 rate : {hybrid_hits}/{n}  ({100*hybrid_hits/n:.0f}%)")
print(f"  Improvement                : +{hybrid_hits - vector_hits} queries")
print("=" * 110)

if misses:
    print(f"\nMisses ({len(misses)}):")
    for q, exp, top in misses:
        print(f"  '{q}'  expected one of {exp}")
        print(f"    got: {top or '(empty)'}")
