"""
Supabase database connection module.

Provides two client factories:
  - get_supabase_client()       → uses SERVICE_ROLE key (bypasses RLS) — for backend use only
  - get_supabase_anon_client()  → uses ANON key (subject to RLS) — for testing RLS policies

Both are lazily initialised on first call and cached for the process lifetime.
When a real Supabase instance is not configured (dummy URL), a mock client
with sample Indian Railways data is used instead.
"""

import logging
from functools import lru_cache

from config.settings import settings

logger = logging.getLogger(__name__)

_USE_MOCK = "demo" in settings.SUPABASE_URL.lower()


def _get_mock_client():
    """Return a mock Supabase client with sample data."""
    from database.mock_client import MockSupabaseClient
    return MockSupabaseClient()


@lru_cache(maxsize=1)
def get_supabase_client():
    """
    Return a Supabase client authenticated with the **service_role** key.

    This client bypasses Row Level Security and should ONLY be used in
    trusted server-side code (FastAPI routes / background jobs).
    Falls back to a mock client when no real Supabase is configured.
    """
    if _USE_MOCK:
        logger.warning("No real Supabase configured — using mock client with sample data")
        return _get_mock_client()
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def get_supabase_anon_client():
    """
    Return a Supabase client authenticated with the **anon** key.

    This client respects Row Level Security policies.
    Falls back to a mock client when no real Supabase is configured.
    """
    if _USE_MOCK:
        return _get_mock_client()
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
