"""
Root conftest for backend tests.

Sets dummy Supabase environment variables so that config.settings.Settings()
can be instantiated without a real .env file. These are loaded BEFORE any
test module is imported, preventing pydantic ValidationErrors during collection.
"""
import os

# Set dummy env vars BEFORE anything else is imported
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key-placeholder")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-placeholder")
os.environ.setdefault("APP_ENV", "test")
