import re, base64
from pathlib import Path
from urllib.parse import urlparse, unquote
import mimetypes

def encode_image(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def encode_image_with_type(path):
    """Read image as base64 and detect correct MIME type."""
    mime_type, _ = mimetypes.guess_type(path)
    if mime_type is None:
        mime_type = "image/jpeg"  # fallback for unknown types

    b64data = encode_image(path)
    return {"data": b64data, "type": mime_type}


def get_base_path():
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


def extract_filename_from_path(path):
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

        filename = extract_filename_from_path(original_path)
        full_path = base_path / filename

        if full_path.exists():
            print(f"✅ Success: Image found at {full_path}")
            image_inputs.append(str(full_path))
        else:
            print(f"⚠️ Warning: Image not found at {full_path}")
            print(f"   Original path: {original_path}")
            print(f"   Extracted filename: {filename}")

    return image_inputs
