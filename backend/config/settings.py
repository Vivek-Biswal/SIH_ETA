import json
from pydantic_settings import BaseSettings
from pydantic import Field, AliasChoices, field_validator


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    SUPABASE_URL: The project API URL (e.g. https://xyz.supabase.co)
    SUPABASE_ANON_KEY: Publishable anon key — safe for client-side, subject to RLS.
    SUPABASE_SERVICE_ROLE_KEY: Secret key that bypasses RLS — backend only, NEVER expose.
    """

    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str = Field(
        default="https://demo-project.supabase.co",
        description="Supabase project URL (https://<ref>.supabase.co)",
    )
    SUPABASE_ANON_KEY: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-anon-key",
        description="Supabase anon/public key — subject to RLS policies",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-service-role-key",
        description="Supabase service_role key — bypasses RLS. NEVER expose to clients.",
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_ENV: str = Field(default="development")
    APP_HOST: str = Field(default="0.0.0.0")
    APP_PORT: int = Field(
        default=8000,
        validation_alias=AliasChoices("PORT", "APP_PORT"),
        description="Application port (accepts cloud PaaS PORT or APP_PORT)",
    )
    DEBUG: bool = Field(default=True)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="Allowed CORS origins for the FastAPI backend (JSON array or comma-separated)",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()

