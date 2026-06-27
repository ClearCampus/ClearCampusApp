import os

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone

load_dotenv()

pinecone_key = os.getenv("PINECONE_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")
if not pinecone_key:
    raise RuntimeError("PINECONE_API_KEY is not set")
if not openai_key:
    raise RuntimeError("OPENAI_API_KEY is not set")

pc = Pinecone(api_key=pinecone_key)
client = OpenAI(api_key=openai_key)

index = pc.Index("tamu-clubs")


def search(query: str, top_k: int = 5, fetch: int = 20, rerank: bool = True) -> None:
    vec = (
        client.embeddings.create(model="text-embedding-3-small", input=query)
        .data[0]
        .embedding
    )
    results = index.query(vector=vec, top_k=fetch, include_metadata=True)

    print(f"Query: '{query}'\n")

    if rerank:
        documents = [m.metadata["text"] for m in results.matches if m.metadata]
        reranked = pc.inference.rerank(
            model="bge-reranker-v2-m3",
            query=query,
            documents=documents,
            top_n=top_k,
            return_documents=True,
        )
        for i, item in enumerate(reranked.data, 1):
            if item.index is None:
                continue
            original = results.matches[item.index]
            m = original.metadata
            if m is None:
                continue
            vec_score = round(original.score, 3) if original.score is not None else 0.0
            rerank_score = round(item.score, 3) if item.score is not None else 0.0
            print(f"{i}. [vec:{vec_score} | rerank:{rerank_score}] {m['name']}")
            print(f"   {m['description'][:150]}")
            print(f"   {m['url']}")
            print()
    else:
        for i, match in enumerate(results.matches[:top_k], 1):
            m = match.metadata
            if m is None:
                continue
            vec_score = round(match.score, 3) if match.score is not None else 0.0
            print(f"{i}. [vec:{vec_score}] {m['name']}")
            print(f"   {m['description'][:150]}")
            print(f"   {m['url']}")
            print()


search("social active clubs, but not too competitive")
