from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    SUPABASE_URL: The project API URL (e.g. https://xyz.supabase.co)
    SUPABASE_ANON_KEY: Publishable anon key — safe for client-side, subject to RLS.
    SUPABASE_SERVICE_ROLE_KEY: Secret key that bypasses RLS — backend only, NEVER expose.
    """

    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str = Field(
        ...,
        description="Supabase project URL (https://<ref>.supabase.co)",
    )
    SUPABASE_ANON_KEY: str = Field(
        ...,
        description="Supabase anon/public key — subject to RLS policies",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        ...,
        description="Supabase service_role key — bypasses RLS. NEVER expose to clients.",
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_HOST: str = Field(default="0.0.0.0")
    APP_PORT: int = Field(default=8000)
    DEBUG: bool = Field(default=True)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="Allowed CORS origins for the FastAPI backend",
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
