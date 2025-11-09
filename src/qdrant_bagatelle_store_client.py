from api.qdrant_remote_client import get_remote_client
from api.replicate_client import get_clip_embedding
from api.openai_client import get_llm_client
import re, base64
from pathlib import Path
from urllib.parse import urlparse, unquote

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


def get_base_path():
    """Get the base path for static files, works in both local and Render."""
    # Try to find the static directory relative to the current file
    current_file = Path(__file__).resolve()

    # Check if static folder exists relative to current file
    static_path = current_file.parent / "static" / "data" / "images"
    if static_path.exists():
        return static_path

    # Check if static folder exists in the project root
    project_root = current_file.parent
    while project_root.parent != project_root:
        static_path = project_root / "static" / "data" / "images"
        if static_path.exists():
            return static_path
        project_root = project_root.parent

    # Fallback to current working directory
    static_path = Path.cwd() / "static" / "data" / "images"
    if static_path.exists():
        return static_path

    raise FileNotFoundError("Could not locate static/data/images directory")


def get_base_path() -> Path:
    """Get the base path for static files, works in both local and Render."""
    current_file = Path(__file__).resolve()

    # Check if static folder exists relative to current file
    static_path = current_file.parent / "static" / "data" / "images"
    if static_path.exists():
        return static_path

    # Check if static folder exists in the project root
    project_root = current_file.parent
    while project_root.parent != project_root:
        static_path = project_root / "static" / "data" / "images"
        if static_path.exists():
            return static_path
        project_root = project_root.parent

    # Fallback to current working directory
    static_path = Path.cwd() / "static" / "data" / "images"
    if static_path.exists():
        return static_path

    raise FileNotFoundError("Could not locate static/data/images directory")


def encode_image(path: str) -> str:
    """Encode an image file as base64."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def extract_filename_from_path(path: str) -> str:
    """Extract just the filename from a URL or file path."""
    # Parse URL if it's a URL
    parsed = urlparse(path)
    if parsed.scheme in ('http', 'https'):
        # Extract path from URL and decode URL encoding
        path = unquote(parsed.path)

    # Remove leading ../ or ./
    path = re.sub(r"^\.\.?/", "", path)
    # Normalize slashes
    path = path.replace("\\", "/")

    # Extract just the filename if it contains static/data/images/
    if "static/data/images/" in path:
        path = path.split("static/data/images/")[-1]

    return path


def get_images(context_paths: str):
    base_path = get_base_path()
    image_inputs = []

    for line in context_paths.strip().splitlines():
        original_path = line.strip()
        if not original_path:
            continue

        # Extract the actual filename
        filename = extract_filename_from_path(original_path)

        # Construct full path
        full_path = base_path / filename

        if full_path.exists():
            print(f"✅ Success: Image found at {full_path}")
            image_inputs.append(encode_image(str(full_path)))
        else:
            print(f"⚠️ Warning: Image not found at {full_path}")
            print(f"   Original path: {original_path}")
            print(f"   Extracted filename: {filename}")

    return image_inputs


def ask_llm_about_artworks(question, image_paths):
    image_inputs = get_images(image_paths)

    if not image_inputs:
        return "Error: No images could be loaded. Please check the image paths."

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