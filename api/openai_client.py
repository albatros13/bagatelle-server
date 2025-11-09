import os
import base64
from openai import OpenAI
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.error("❌ Configuration error: OPENAI_API_KEY not found in environment or .env file.")
    raise RuntimeError(
        "Configuration error: OPENAI_API_KEY not found. "
        "Please set it as an environment variable or in your .env file."
    )

llm_client = OpenAI(api_key=OPENAI_API_KEY)

def get_llm_client():
    return llm_client

def get_image_description_from_file(image_path, question, model="gpt-4o"):
    try:
        # Function to encode the image
        def encode_image(image_path):
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode("utf-8")

        # Getting the base64 string
        base64_image = encode_image(image_path)

        response = llm_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        }
                    ],
                }
            ])
        return response.choices[0].message.content
    except Exception as e:
        return str(e)