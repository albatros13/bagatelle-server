import base64
import os
from anthropic import Anthropic
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    logger.error("❌ Configuration error: ANTHROPIC_API_KEY not found in environment or .env file.")
    raise RuntimeError(
        "Configuration error: ANTHROPIC_API_KEY not found. "
        "Please set it as an environment variable or in your .env file."
    )

# Initialize Claude client
client = Anthropic(api_key=ANTHROPIC_API_KEY)

def get_image_description_from_file(image_path, question="Describe this image", model="claude-3-5-sonnet-20241022"):
    """
    Uses Anthropic Claude 3.5 to generate a description of an image.
    """
    try:
        # Encode the image to base64
        def encode_image(image_path):
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode("utf-8")

        base64_image = encode_image(image_path)

        # Claude API call with multimodal input
        response = client.messages.create(
            model=model,
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image,
                            },
                        },
                    ],
                }
            ],
        )

        # Return Claude’s textual output
        return response.content[0].text

    except Exception as e:
        return str(e)
