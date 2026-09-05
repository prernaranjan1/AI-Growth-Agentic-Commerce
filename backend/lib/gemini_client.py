import asyncio
import os
from typing import Optional

from google import genai
from google.genai import types


# Keep one client per process. The API key is read from the environment only.
_client: Optional[genai.Client] = None


def _get_api_key() -> Optional[str]:
    # GEMINI_API_KEY is the preferred name. The other two keep compatibility
    # with the existing backend configuration.
    return (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("_GEMINI_API_KEY")
    )


def get_gemini_client() -> Optional[genai.Client]:
    global _client

    api_key = _get_api_key()
    if not api_key:
        return None

    if _client is None:
        _client = genai.Client(api_key=api_key)

    return _client


def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


async def generate_text(
    prompt: str,
    *,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.4,
    max_output_tokens: int = 700,
) -> Optional[str]:
    """Generate text without blocking FastAPI's event loop."""
    client = get_gemini_client()
    if client is None:
        return None

    config_kwargs = {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }

    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    config = types.GenerateContentConfig(**config_kwargs)

    response = await asyncio.to_thread(
        client.models.generate_content,
        model=get_model_name(),
        contents=prompt,
        config=config,
    )

    text = getattr(response, "text", None)
    if not text:
        return None

    return text.strip()
