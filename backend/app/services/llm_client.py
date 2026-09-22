from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import Settings
from app.schemas.document import DocumentAiAssessment
from app.schemas.evaluation import AiAssessment


class LlmConfigurationError(Exception):
    """Raised when LLM settings are missing or incomplete."""


class LlmRequestError(Exception):
    """Raised when the LLM provider call fails."""


class LlmResponseError(Exception):
    """Raised when the LLM response cannot be parsed/validated."""


def _chat_completion_json(
    *,
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
) -> dict[str, Any]:
    if not settings.llm_configured:
        raise LlmConfigurationError(
            "OPENAI_API_KEY is not configured in backend/.env."
        )

    url = f"{settings.openai_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": settings.openai_model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(url, headers=headers, json=payload)
    except httpx.HTTPError as exc:
        raise LlmRequestError(f"LLM request failed: {exc}") from exc

    if response.status_code >= 400:
        # Keep detail for internal exception chaining; callers must not expose raw body.
        detail = response.text[:300]
        raise LlmRequestError(
            f"LLM provider returned HTTP {response.status_code}: {detail}"
        )

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise LlmResponseError("LLM response was not valid JSON.") from exc

    if not isinstance(parsed, dict):
        raise LlmResponseError("LLM response was not a JSON object.")
    return parsed


def generate_ai_assessment(
    *,
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
) -> AiAssessment:
    parsed = _chat_completion_json(
        settings=settings,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )
    try:
        return AiAssessment.model_validate(parsed)
    except Exception as exc:  # pydantic ValidationError
        raise LlmResponseError(
            "LLM JSON did not match the expected assessment schema."
        ) from exc


def generate_document_ai_assessment(
    *,
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
) -> DocumentAiAssessment:
    parsed = _chat_completion_json(
        settings=settings,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )
    try:
        return DocumentAiAssessment.model_validate(parsed)
    except Exception as exc:  # pydantic ValidationError
        raise LlmResponseError(
            "LLM JSON did not match the expected document assessment schema."
        ) from exc
