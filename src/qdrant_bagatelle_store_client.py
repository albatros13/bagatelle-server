from api.qdrant_remote_client import get_remote_client
from api.replicate_client import get_clip_embedding
from api.openai_client import get_llm_client
import requests
import os, re, base64

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


def load_image_as_base64(path_or_url: str) -> str:
    """
    Loads an image from local disk OR URL and returns base64-encoded content.
    Universal for local dev and Render deployment.
    """
    # Normalize slashes
    clean = path_or_url.strip().replace("\\", "/")

    # Local file?
    if os.path.exists(clean):
        with open(clean, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    # URL?
    if clean.startswith("http://") or clean.startswith("https://"):
        resp = requests.get(clean)
        if resp.status_code == 200:
            return base64.b64encode(resp.content).decode("utf-8")
        else:
            print(f"⚠️ Warning: Could not fetch URL {clean} ({resp.status_code})")
            return None

    print(f"⚠️ Warning: Not a valid path or url: {clean}")
    return None


def get_images(context_paths: str):
    """
    Takes a newline-separated list of paths.
    Each may be a local file path or a URL.
    Returns a list of base64 images.
    """
    image_inputs = []

    for line in context_paths.strip().splitlines():
        clean = re.sub(r"^\.\./", "./", line.strip())
        clean = clean.replace("\\", "/")

        # Try local first → then URL fallback
        encoded = load_image_as_base64(clean)

        if encoded:
            print(f"✅ Loaded image from {clean}")
            image_inputs.append(encoded)
        else:
            print(f"❌ Failed to load image: {clean}")

    return image_inputs

def ask_llm_about_artworks(question, image_paths):
    image_inputs = get_images(image_paths)
    client_llm = get_llm_client()
    resp = client_llm.chat.completions.create(
        model="gpt-5",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "You are an expert in art and medicine. Use the following images to answer:"
                    },
                    *[
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image}"
                            }
                        }
                        for image in image_inputs
                    ],
                    {"type": "text", "text": f"Question: {question}"}
                ]
            }
        ]
    )
    return resp.choices[0].message.content
