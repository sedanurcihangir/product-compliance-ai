import os
from functools import lru_cache

from dotenv import load_dotenv
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_ROOT / ".env")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings:
    """Runtime settings loaded from backend/.env."""

    def __init__(self) -> None:
        self.openai_api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        self.openai_base_url = (
            os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1"
        ).rstrip("/")
        self.openai_model = (os.getenv("OPENAI_MODEL") or "gpt-4o-mini").strip()
        use_llm = (os.getenv("EVALUATION_USE_LLM") or "true").strip().lower()
        self.evaluation_use_llm = use_llm in {"1", "true", "yes", "on"}

        self.auth_secret_key = (os.getenv("AUTH_SECRET_KEY") or "").strip()
        self.auth_cookie_name = (
            os.getenv("AUTH_COOKIE_NAME") or "pca_access_token"
        ).strip()
        try:
            self.auth_token_expire_minutes = int(
                os.getenv("AUTH_TOKEN_EXPIRE_MINUTES") or "10080"
            )
        except ValueError:
            self.auth_token_expire_minutes = 10080
        secure = (os.getenv("AUTH_COOKIE_SECURE") or "false").strip().lower()
        self.auth_cookie_secure = secure in {"1", "true", "yes", "on"}
        samesite = (os.getenv("AUTH_COOKIE_SAMESITE") or "lax").strip().lower()
        self.auth_cookie_samesite = (
            samesite if samesite in {"lax", "strict", "none"} else "lax"
        )

    @property
    def llm_configured(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def auth_configured(self) -> bool:
        return bool(self.auth_secret_key)
