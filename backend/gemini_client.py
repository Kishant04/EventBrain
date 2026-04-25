import asyncio
import os
import time
import hashlib
import random
from pathlib import Path
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().with_name(".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
CACHE_TTL_SECONDS = int(os.getenv("LLM_CACHE_TTL_SECONDS", "900"))
CACHE_MAX_ITEMS = int(os.getenv("LLM_CACHE_MAX_ITEMS", "500"))
HTTP_TIMEOUT_SECONDS = int(os.getenv("LLM_HTTP_TIMEOUT_SECONDS", "90"))
MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "3"))
BACKOFF_BASE_SECONDS = float(os.getenv("LLM_BACKOFF_BASE_SECONDS", "1.0"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))
GEMINI_FALLBACK_MODELS = os.getenv("GEMINI_FALLBACK_MODELS", "")
BACKOFF_MAX_SECONDS = float(os.getenv("LLM_BACKOFF_MAX_SECONDS", "20.0"))

_cache: dict[str, tuple[float, str]] = {}


# Builds a deterministic cache key from prompt + user message.
def _cache_key(system_prompt: str, user_message: str) -> str:
    combined = f"{system_prompt}::{user_message}"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> str | None:
    entry = _cache.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if expires_at <= time.time():
        _cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: str) -> None:
    if len(_cache) >= CACHE_MAX_ITEMS:
        # Remove oldest entry to keep cache bounded.
        oldest_key = min(_cache, key=lambda k: _cache[k][0])
        _cache.pop(oldest_key, None)
    _cache[key] = (time.time() + CACHE_TTL_SECONDS, value)


def _extract_gemini_text(body: dict) -> str:
    # Normalizes Gemini response JSON into plain text output.
    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini response has no candidates: {body}")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    texts = [part.get("text") for part in parts if isinstance(part, dict) and part.get("text")]
    if not texts:
        finish_reason = candidates[0].get("finishReason")
        raise RuntimeError(f"Gemini candidate returned no text parts (finishReason={finish_reason}): {body}")
    return "\n".join(texts)


def _parse_retry_after_seconds(response: httpx.Response | None) -> float | None:
    if response is None:
        return None

    value = response.headers.get("Retry-After")
    if not value:
        return None

    try:
        seconds = float(value)
        return max(0.0, seconds)
    except ValueError:
        # HTTP date format is ignored here; default backoff will be used.
        return None


def _candidate_models() -> list[str]:
    # Produces ordered, de-duplicated model candidates for fallback attempts.
    raw_candidates = [GEMINI_MODEL] + [m.strip() for m in GEMINI_FALLBACK_MODELS.split(",") if m.strip()]
    deduped = []
    seen: set[str] = set()

    for model in raw_candidates:
        if model not in seen:
            deduped.append(model)
            seen.add(model)
    return deduped


async def _call_gemini_with_model(model: str, headers: dict, payload: dict) -> str:
    # Performs one-model retries with exponential backoff and Retry-After support.
    gemini_url = GEMINI_URL_TEMPLATE.format(model=quote(model, safe=""), key=quote(GEMINI_API_KEY, safe=""))
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
                response = await client.post(gemini_url, headers=headers, json=payload)
                response.raise_for_status()
                body = response.json()
                return _extract_gemini_text(body)
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RemoteProtocolError) as exc:
            last_error = exc
        except httpx.HTTPStatusError as exc:
            last_error = exc
            status_code = exc.response.status_code
            # Continue retry loop for transient and rate-limit errors.
            if status_code not in {408, 429, 500, 502, 503, 504}:
                raise
        except Exception as exc:
            last_error = exc
            raise

        if attempt == MAX_RETRIES - 1:
            break

        retry_after = None
        if isinstance(last_error, httpx.HTTPStatusError):
            retry_after = _parse_retry_after_seconds(last_error.response)

        if retry_after is not None:
            sleep_seconds = min(retry_after, BACKOFF_MAX_SECONDS)
        else:
            base = min(BACKOFF_BASE_SECONDS * (2 ** attempt), BACKOFF_MAX_SECONDS)
            jitter = random.uniform(0, base * 0.2)
            sleep_seconds = base + jitter

        await asyncio.sleep(sleep_seconds)

    raise RuntimeError(f"Gemini call failed on model '{model}' after {MAX_RETRIES} attempts: {last_error}")


async def call_gemini(system_prompt: str, user_message: str) -> str:
    # Main public Gemini call path with cache read/write and model fallback handling.
    if not GEMINI_API_KEY:
        raise EnvironmentError("GEMINI_API_KEY is not set in environment variables.")

    key = _cache_key(system_prompt, user_message)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    headers = {"Content-Type": "application/json"}
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_message}]}],
        "generationConfig": {
            "temperature": LLM_TEMPERATURE,
        },
    }

    last_error: Exception | None = None
    models = _candidate_models()
    for model in models:
        try:
            content = await _call_gemini_with_model(model, headers, payload)
            _cache_set(key, content)
            return content
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise RuntimeError(
                    f"Gemini model '{model}' is not available for this API key. "
                    "Set GEMINI_MODEL to a model your key can access."
                ) from exc
            last_error = exc
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Gemini call failed across models {models}: {last_error}")


if __name__ == "__main__":
    import asyncio

    async def test() -> None:
        result = await call_gemini("You are a helpful assistant.", "Say hello in Malay. Also say which model you are.")
        print(result)

    asyncio.run(test())
