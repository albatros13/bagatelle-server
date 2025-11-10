from api.qdrant_remote_client import get_remote_client
from api.replicate_client import get_clip_embedding


def embed_query(text):
    res = get_clip_embedding({
        "text": text
    })
    return res["embedding"]


def search_image_collection(question, top_k):
    q_emb = embed_query(question)
    client = get_remote_client()
    IMAGE_COLLECTION = "bagatelle_image_CLIP-L14"

    image_results = client.search(
        collection_name=IMAGE_COLLECTION,
        query_vector=("image_vector", q_emb),
        limit=top_k,
        with_payload=["title", "image_path"]
    )
    return image_results


def search_text_collection(question, top_k):
    q_emb = embed_query(question)
    client = get_remote_client()
    TEXT_COLLECTION = "bagatelle_text_CLIP-L14"

    text_results = client.search(
        collection_name=TEXT_COLLECTION,
        query_vector=("text_vector", q_emb),
        limit=top_k,
        with_payload=["section_text", "image_path"]
    )
    return text_results


def prepare_response(question, top_k, sorted_results):
    results = [r["point"] for r in sorted_results[:top_k]]
    response = []
    print(f"\nTop {top_k} results for query: '{question}'\n")
    for i, r in enumerate(results, start=1):
        image_path = r.payload.get("image_path", "N/A")
        print(f"{i}. [Score: {r.score:.4f}] ({image_path})")
        response.append(image_path)
    return response


# Export

def query_image_collection(question, top_k=5):
    image_results = search_image_collection(question, top_k=top_k)
    image_map = {}
    for r in image_results:
        img_path = r.payload.get("image_path", "N/A")
        image_map[img_path] = {"point": r, "score": r.score}
    sorted_results = sorted(image_map.values(), key=lambda x: x["score"], reverse=True)
    return prepare_response(question, top_k, sorted_results)


def query_image_and_text_collection(question, top_k=5, text_weight=0.5, image_weight=0.5):
    image_results = search_image_collection(question, top_k)
    text_results = search_text_collection(question, top_k)

    combined = {}
    for r in text_results:
        img_path = r.payload.get("image_path", "N/A")
        combined[img_path] = {"point": r, "score": r.score * text_weight}

    for r in image_results:
        img_path = r.payload.get("image_path", "N/A")
        if img_path in combined:
            combined[img_path]["score"] += r.score * image_weight
        else:
            combined[img_path] = {"point": r, "score": r.score * image_weight}
    sorted_results = sorted(combined.values(), key=lambda x: x["score"], reverse=True)
    return prepare_response(question, top_k, sorted_results)
