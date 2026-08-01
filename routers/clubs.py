import os
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from openai import OpenAI
from pinecone import Pinecone
import firebase_client
from auth import get_current_owner

# Initialize OpenAI and Pinecone search clients if API keys are configured
pinecone_key = os.getenv("PINECONE_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")

pc = None
openai_client = None
index = None

import json

OFFLINE_MODE = os.getenv("OFFLINE_MODE", "false").lower() == "true"

def load_offline_clubs() -> List[dict]:
    try:
        parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(parent, "tamu_clubs.json")
        with open(json_path, "r", encoding="utf-8") as f:
            clubs_data = json.load(f)
            
        formatted = []
        for c in clubs_data:
            # Simple clean slug
            club_id = c.get("name", "").lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "")
            formatted.append({
                "id": club_id,
                "slug": club_id,
                "name": c.get("name", ""),
                "description": c.get("description", ""),
                "url": c.get("url", ""),
                "logo": "/hero.png",
                "claimed": False,
                "events": [],
                "content": [
                    {"id": f"{club_id}-h1", "type": "header", "text": "About Our Club"},
                    {"id": f"{club_id}-b1", "type": "body", "text": c.get("description", "")}
                ]
            })
        return formatted
    except Exception as e:
        print(f"Failed to load offline tamu_clubs.json: {e}")
        return []

if pinecone_key and openai_key:
    try:
        pc = Pinecone(api_key=pinecone_key)
        openai_client = OpenAI(api_key=openai_key)
        index = pc.Index("tamu-clubs")
    except Exception as e:
        print(f"Failed to initialize search API clients: {e}")

router = APIRouter(
    prefix="/api/clubs",
    tags=["Clubs"]
)

# --- Pydantic Schemas ---

class ClubFilters(BaseModel):
    time_commitment: Optional[str] = "medium"
    meeting_types: Optional[List[str]] = Field(default_factory=list)
    fee: Optional[float] = 0.0
    tags: Optional[List[str]] = Field(default_factory=list)

class ClubCreate(BaseModel):
    name: str
    description: str
    url: str
    logo: Optional[str] = None
    applicationsOpen: Optional[bool] = False

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    logo: Optional[str] = None
    applicationsOpen: Optional[bool] = None
    official_email: Optional[str] = None
    phone: Optional[str] = None
    filters: Optional[ClubFilters] = None
    events: Optional[List[dict]] = None

class CustomSection(BaseModel):
    id: str
    type: str  # "text" | "faq" | "links" | "media" | "header" | "body" | "carousel"
    title: Optional[str] = None
    text: Optional[str] = None
    content: Optional[str] = None
    images: Optional[List[str]] = None
    links: Optional[List[Dict[str, str]]] = None

class ClubPageUpdate(BaseModel):
    banner_image_url: Optional[str] = None
    custom_sections: List[CustomSection]


# --- Helpers ---

def url_to_id(url: str | None) -> str:
    if not url:
        return ""
    return url.rstrip("/").split("/")[-1] or url


# --- Endpoints ---

@router.post("", status_code=status.HTTP_201_CREATED)
def create_club(
    club: ClubCreate,
    current_owner: dict = Depends(get_current_owner)
) -> dict:
    """
    Create a new club profile. Generates a unique club ID, updates Firestore,
    synchronizes the embedding vector to Pinecone, and links the club to the owner.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )

    db = firebase_client.db
    uid = current_owner.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token payload."
        )

    # Generate club_id
    club_id = url_to_id(club.url)
    if not club_id:
        # Fallback to slugifying name if URL is not a standard format
        club_id = club.name.lower().replace(" ", "-")

    club_ref = db.collection("clubs").document(club_id)
    if club_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A club with ID '{club_id}' already exists."
        )

    # 1. Create club in Firestore
    club_doc = {
        "id": club_id,
        "name": club.name,
        "description": club.description,
        "url": club.url,
        "logo": club.logo or "/hero.png",
        "applicationsOpen": club.applicationsOpen or False,
        "official_email": current_owner.get("email"),
        "phone": None,
        "claimed": True,
        "owner_uids": [uid],
        "filters": {
            "time_commitment": "medium",
            "meeting_types": [],
            "fee": 0.0,
            "tags": []
        },
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }

    try:
        # Commit to Firestore
        club_ref.set(club_doc)
        
        # Link club to owner's profile
        user_ref = db.collection("users").document(uid)
        user_ref.update({
            "owned_clubs": firestore.ArrayUnion([club_id])
        })
    except Exception as e:
        print(f"Firestore operations failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create club record: {e}"
        )

    # Retrieve and return fresh record
    invalidate_clubs_cache()
    created_snap = club_ref.get()
    return created_snap.to_dict() or {}


# In-memory cache for GET /api/clubs
_clubs_cache: Optional[List[dict]] = None

def invalidate_clubs_cache():
    global _clubs_cache
    _clubs_cache = None
    print("Clubs database cache invalidated.")

@router.get("")
def list_clubs() -> List[dict]:
    """
    Public endpoint to retrieve all clubs in the database with caching.
    """
    global _clubs_cache
    if _clubs_cache is not None:
        return _clubs_cache

    if OFFLINE_MODE or firebase_client.db is None:
        print("Serving clubs list from offline tamu_clubs.json file.")
        _clubs_cache = load_offline_clubs()
        return _clubs_cache

    db = firebase_client.db
    docs = db.collection("clubs").stream()
    
    # Prefetch all club pages to avoid N+1 queries
    pages_snap = db.collection("club_pages").stream()
    pages_map = {}
    for p in pages_snap:
        p_dict = p.to_dict() or {}
        pages_map[p.id] = p_dict.get("custom_sections", [])

    clubs_list = []
    for doc in docs:
        c_data = doc.to_dict() or {}
        cid = c_data.get("id") or doc.id
        c_data["slug"] = cid
        c_data["content"] = pages_map.get(cid, [])
        if "events" not in c_data:
            c_data["events"] = []
        clubs_list.append(c_data)
        
    return clubs_list


_embedded_clubs_cache = None

def load_embedded_clubs() -> List[dict]:
    global _embedded_clubs_cache
    if _embedded_clubs_cache is not None:
        return _embedded_clubs_cache
        
    try:
        parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(parent, "tamu_clubs_embedded.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                _embedded_clubs_cache = json.load(f)
                print(f"Loaded {len(_embedded_clubs_cache)} pre-embedded clubs locally.")
                return _embedded_clubs_cache
    except Exception as e:
        print(f"Failed to load tamu_clubs_embedded.json: {e}")
    return []

def local_tfidf_search(query: str, clubs: List[dict], limit: int) -> List[dict]:
    import math
    from collections import Counter
    
    def tokenize(text: str) -> List[str]:
        words = []
        for word in text.lower().split():
            clean = "".join(c for c in word if c.isalnum())
            if clean and len(clean) > 2:
                words.append(clean)
        return words

    corpus = []
    df = Counter()
    for c in clubs:
        doc_text = f"{c.get('name', '')} {c.get('description', '')}"
        tokens = set(tokenize(doc_text))
        corpus.append((c, Counter(tokenize(doc_text))))
        for t in tokens:
            df[t] += 1

    num_docs = len(clubs)
    idf = {}
    for token, freq in df.items():
        idf[token] = math.log(1.0 + (num_docs / freq))

    query_tokens = tokenize(query)
    if not query_tokens:
        return clubs[:limit]
        
    query_tf = Counter(query_tokens)
    query_vector = {}
    query_norm = 0.0
    for token, tf in query_tf.items():
        if token in idf:
            val = tf * idf[token]
            query_vector[token] = val
            query_norm += val * val
    query_norm = math.sqrt(query_norm)

    if query_norm == 0.0:
        return clubs[:limit]

    scored_clubs = []
    for c, doc_tf in corpus:
        dot_product = 0.0
        doc_norm = 0.0
        for token, tf in doc_tf.items():
            if token in idf:
                val = tf * idf[token]
                doc_norm += val * val
                if token in query_vector:
                    dot_product += val * query_vector[token]
        
        doc_norm = math.sqrt(doc_norm)
        score = 0.0
        if doc_norm > 0.0:
            score = dot_product / (query_norm * doc_norm)
            
        name_lower = c.get("name", "").lower()
        for qt in query_tokens:
            if qt in name_lower:
                score += 0.25
                
        scored_clubs.append((score, c))

    scored_clubs.sort(key=lambda x: x[0], reverse=True)
    
    results = []
    for score, c in scored_clubs:
        if score > 0.0:
            c["score"] = round(score, 4)
            results.append(c)
            
    return results[:limit]

@router.get("/search")
def search_clubs(query: str, limit: int = 5) -> List[dict]:
    """
    Search for clubs using natural language query, OpenAI embeddings, and Pinecone vector search.
    Falls back to local vector search (using tamu_clubs_embedded.json) or local TF-IDF offline.
    """
    def local_search_fallback():
        clubs = load_offline_clubs()
        return local_tfidf_search(query, clubs, limit)

    def firestore_fallback():
        if firebase_client.db is None:
            return local_search_fallback()
        try:
            docs = firebase_client.db.collection("clubs").stream()
            clubs_list = []
            for doc in docs:
                c_data = doc.to_dict() or {}
                c_data["slug"] = doc.id
                if "events" not in c_data:
                    c_data["events"] = []
                if "content" not in c_data:
                    c_data["content"] = []
                clubs_list.append(c_data)
            return local_tfidf_search(query, clubs_list, limit)
        except Exception as e:
            print(f"Firestore fallback stream failed: {e}")
            return local_search_fallback()

    if not query:
        return []

    if OFFLINE_MODE:
        if openai_client:
            try:
                response = openai_client.embeddings.create(
                    model="text-embedding-3-small",
                    input=query
                )
                query_vec = response.data[0].embedding
                embedded_clubs = load_embedded_clubs()
                if embedded_clubs:
                    scored = []
                    for c in embedded_clubs:
                        c_vec = c.get("vector")
                        if not c_vec or len(c_vec) != len(query_vec):
                            continue
                        dot_product = sum(a * b for a, b in zip(query_vec, c_vec))
                        
                        club_id = url_to_id(c.get("url", ""))
                        if not club_id:
                            club_id = c.get("name", "").lower().replace(" ", "-")
                            
                        scored.append((dot_product, {
                            "id": club_id,
                            "slug": club_id,
                            "name": c.get("name", ""),
                            "description": c.get("description", ""),
                            "url": c.get("url", ""),
                            "logo": "/hero.png",
                            "score": dot_product,
                            "events": [],
                            "content": [
                                {"id": f"{club_id}-h1", "type": "header", "text": "About Our Club"},
                                {"id": f"{club_id}-b1", "type": "body", "text": c.get("description", "")}
                            ]
                        }))
                    scored.sort(key=lambda x: x[0], reverse=True)
                    return [item[1] for item in scored[:limit]]
            except Exception as e:
                print(f"Offline vector similarity matching failed: {e}")
        return local_search_fallback()

    if not pc or not openai_client or not index:
        return firestore_fallback()

    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        )
        vec = response.data[0].embedding
        
        fetch_k = limit * 4
        try:
            results = index.query(vector=vec, top_k=fetch_k, include_metadata=True)
        except Exception as pc_err:
            print(f"Pinecone query failed: {pc_err}. Performing local vector search.")
            results = None
            
        if not results or not results.matches:
            embedded_clubs = load_embedded_clubs()
            if embedded_clubs:
                scored = []
                for c in embedded_clubs:
                    c_vec = c.get("vector")
                    if not c_vec or len(c_vec) != len(vec):
                        continue
                    dot_product = sum(a * b for a, b in zip(vec, c_vec))
                    club_id = url_to_id(c.get("url", "")) or c.get("name", "").lower().replace(" ", "-")
                    scored.append((dot_product, {
                        "id": club_id,
                        "slug": club_id,
                        "name": c.get("name", ""),
                        "description": c.get("description", ""),
                        "url": c.get("url", ""),
                        "logo": "/hero.png",
                        "score": dot_product,
                        "events": [],
                        "content": []
                    }))
                scored.sort(key=lambda x: x[0], reverse=True)
                return [item[1] for item in scored[:limit]]
            return firestore_fallback()
            
        matches = []
        for match in results.matches:
            m = match.metadata
            if m is None:
                continue
            
            club_id = url_to_id(m.get("url", ""))
            if not club_id:
                club_id = m.get("name", "").lower().replace(" ", "-")

            matches.append({
                "id": club_id,
                "slug": club_id,
                "name": m.get("name", ""),
                "description": m.get("description", ""),
                "url": m.get("url", ""),
                "logo": "/hero.png",
                "score": match.score,
                "events": [],
                "content": []
            })
            
        try:
            documents = [m.get("text", f"{m.get('name')} | {m.get('description')}") for m in [match.metadata for match in results.matches if match.metadata]]
            if documents:
                reranked = pc.inference.rerank(
                    model="bge-reranker-v2-m3",
                    query=query,
                    documents=documents,
                    top_n=limit,
                    return_documents=True,
                )
                
                reranked_matches = []
                for item in reranked.data:
                    if item.index is None:
                        continue
                    original = matches[item.index]
                    original["rerank_score"] = item.score
                    reranked_matches.append(original)
                return reranked_matches
        except Exception as rerank_err:
            print(f"Reranking failed (falling back to vector score): {rerank_err}")
            
        return matches[:limit]

    except Exception as e:
        print(f"Vector search failed (falling back to Firestore): {e}")
        return firestore_fallback()


@router.get("/{club_id}")
def get_club(club_id: str) -> dict:
    """
    Public endpoint to retrieve a club's basic details including its page layouts.
    """
    if OFFLINE_MODE or firebase_client.db is None:
        clubs = load_offline_clubs()
        for c in clubs:
            if c["id"] == club_id:
                return c
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found offline."
        )

    db = firebase_client.db
    club_ref = db.collection("clubs").document(club_id)
    club_snap = club_ref.get()

    if not club_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found."
        )

    c_data = club_snap.to_dict() or {}
    c_data["slug"] = club_id
    
    # Fetch page content
    page_ref = db.collection("club_pages").document(club_id)
    page_snap = page_ref.get()
    if page_snap.exists:
        page_data = page_snap.to_dict() or {}
        c_data["content"] = page_data.get("custom_sections", [])
    else:
        c_data["content"] = []
        
    if "events" not in c_data:
        c_data["events"] = []
        
    return c_data


@router.put("/{club_id}")
def update_club(
    club_id: str,
    club: ClubUpdate,
    current_owner: dict = Depends(get_current_owner)
) -> dict:
    """
    Update an existing club's profile. Validates owner permissions,
    updates Firestore, and updates Pinecone in real-time.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )

    db = firebase_client.db
    uid = current_owner.get("uid")

    club_ref = db.collection("clubs").document(club_id)
    club_snap = club_ref.get()
    if not club_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found."
        )

    club_data = club_snap.to_dict() or {}
    if uid not in club_data.get("owner_uids", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permissions to modify this club."
        )

    # Build update dict
    update_data: Dict[str, Any] = {}
    if club.name is not None:
        update_data["name"] = club.name
    if club.description is not None:
        update_data["description"] = club.description
    if club.url is not None:
        update_data["url"] = club.url
    if club.logo is not None:
        update_data["logo"] = club.logo
    if club.applicationsOpen is not None:
        update_data["applicationsOpen"] = club.applicationsOpen
    if club.official_email is not None:
        update_data["official_email"] = club.official_email
    if club.phone is not None:
        update_data["phone"] = club.phone
    if club.filters is not None:
        filters_data = {}
        if club.filters.time_commitment is not None:
            filters_data["time_commitment"] = club.filters.time_commitment
        if club.filters.meeting_types is not None:
            filters_data["meeting_types"] = club.filters.meeting_types
        if club.filters.fee is not None:
            filters_data["fee"] = club.filters.fee
        if club.filters.tags is not None:
            filters_data["tags"] = club.filters.tags
        update_data["filters"] = filters_data
    if club.events is not None:
        update_data["events"] = club.events

    if not update_data:
        return club_data

    update_data["updated_at"] = firestore.SERVER_TIMESTAMP

    try:
        club_ref.update(update_data)
    except Exception as e:
        print(f"Firestore update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update club record in Firestore: {e}"
        )

    # Re-fetch the updated document
    invalidate_clubs_cache()
    updated_snap = club_ref.get()
    updated_data = updated_snap.to_dict() or {}

    return updated_data


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    current_owner: dict = Depends(get_current_owner)
) -> None:
    """
    Deletes a club profile, its page, and its Pinecone vector.
    Removes the club ID from any owner's user doc.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )

    db = firebase_client.db
    uid = current_owner.get("uid")

    club_ref = db.collection("clubs").document(club_id)
    club_snap = club_ref.get()
    if not club_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found."
        )

    club_data = club_snap.to_dict() or {}
    owner_uids = club_data.get("owner_uids", [])
    if uid not in owner_uids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permissions to modify this club."
        )

    try:
        # Delete from clubs collection
        club_ref.delete()

        # Delete corresponding custom page document if exists
        db.collection("club_pages").document(club_id).delete()

        # Remove from owner profiles
        for owner_uid in owner_uids:
            db.collection("users").document(owner_uid).update({
                "owned_clubs": firestore.ArrayRemove([club_id])
            })
    except Exception as e:
        print(f"Firestore deletions failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete club records from Firestore: {e}"
        )
    invalidate_clubs_cache()


# --- Club Page Custom Sections Endpoints ---

@router.get("/{club_id}/page")
def get_club_page(club_id: str) -> dict:
    """
    Public endpoint to fetch a club's custom page layout blocks.
    Returns default empty structure if no custom page is configured.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )

    db = firebase_client.db
    # First verify if the club exists at all
    club_ref = db.collection("clubs").document(club_id)
    if not club_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found."
        )

    page_ref = db.collection("club_pages").document(club_id)
    page_snap = page_ref.get()

    if not page_snap.exists:
        # Return a default empty page representation rather than 404
        return {
            "club_id": club_id,
            "banner_image_url": None,
            "custom_sections": []
        }

    return page_snap.to_dict() or {}


@router.put("/{club_id}/page")
def update_club_page(
    club_id: str,
    page: ClubPageUpdate,
    current_owner: dict = Depends(get_current_owner)
) -> dict:
    """
    Updates or creates a club's custom page layout blocks.
    Verifies owner permissions.
    """
    if firebase_client.db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Firestore connection is not initialized."
        )

    db = firebase_client.db
    uid = current_owner.get("uid")

    club_ref = db.collection("clubs").document(club_id)
    club_snap = club_ref.get()
    if not club_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID '{club_id}' not found."
        )

    club_data = club_snap.to_dict() or {}
    if uid not in club_data.get("owner_uids", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permissions to modify this club."
        )

    page_ref = db.collection("club_pages").document(club_id)
    
    # Map CustomSection list to dictionaries for Firestore
    sections_list = [s.model_dump() for s in page.custom_sections]

    page_data = {
        "club_id": club_id,
        "banner_image_url": page.banner_image_url,
        "custom_sections": sections_list,
        "updated_at": firestore.SERVER_TIMESTAMP
    }

    try:
        page_ref.set(page_data, merge=True)
    except Exception as e:
        print(f"Firestore page write failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update club page: {e}"
        )

    # Return refreshed page record
    invalidate_clubs_cache()
    updated_page_snap = page_ref.get()
    return updated_page_snap.to_dict() or {}
