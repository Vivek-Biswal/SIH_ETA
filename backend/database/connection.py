"""
Supabase database connection module.

Provides two client factories:
  - get_supabase_client()       → uses SERVICE_ROLE key (bypasses RLS) — for backend use only
  - get_supabase_anon_client()  → uses ANON key (subject to RLS) — for testing RLS policies

Both are lazily initialised on first call and cached for the process lifetime.
"""

from functools import lru_cache

from supabase import create_client, Client

from config.settings import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Return a Supabase client authenticated with the **service_role** key.

    This client bypasses Row Level Security and should ONLY be used in
    trusted server-side code (FastAPI routes / background jobs).
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def get_supabase_anon_client() -> Client:
    """
    Return a Supabase client authenticated with the **anon** key.

    This client respects Row Level Security policies.
    Useful for verifying that RLS policies work as expected.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
