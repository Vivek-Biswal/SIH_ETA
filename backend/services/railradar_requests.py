"""Bounded shared cache and ordered credential failover; never persist raw keys."""
from contextlib import contextmanager
from copy import deepcopy
from email.utils import parsedate_to_datetime
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
from threading import Lock
from time import time

import httpx
from fastapi import HTTPException
from config.settings import settings


class RequestManager:
    def __init__(self, path, keys):
        self.keys = list(dict.fromkeys(k.strip() for k in keys if k.strip()))
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._locks = [Lock() for _ in range(64)]
        # Serialize provider calls so concurrent misses do not race credential state.
        self._upstream = Lock()
        with self._db() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY, body TEXT NOT NULL, saved REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS cooldowns (id TEXT PRIMARY KEY, until REAL NOT NULL, reason TEXT NOT NULL);
            ''')

    @contextmanager
    def _db(self):
        db = sqlite3.connect(self.path, timeout=15)
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def cache_key(path, params=None):
        return sha256(json.dumps([path, params or {}], sort_keys=True, separators=(',', ':')).encode()).hexdigest()

    def _cached(self, cache_key):
        with self._db() as db:
            row = db.execute('SELECT body, saved FROM responses WHERE id=?', (cache_key,)).fetchone()
        if row:
            try:
                return json.loads(row[0]), row[1]
            except (ValueError, TypeError):
                pass
        return None

    def remember(self, path, params, data, saved=None):
        with self._db() as db:
            db.execute('INSERT OR REPLACE INTO responses VALUES (?,?,?)',
                       (self.cache_key(path, params), json.dumps(data, allow_nan=False), time() if saved is None else saved))
            db.execute('DELETE FROM responses WHERE id IN (SELECT id FROM responses ORDER BY saved DESC LIMIT -1 OFFSET 2000)')

    def alias(self, path, source_params, target_params):
        cached = self._cached(self.cache_key(path, source_params))
        if cached:
            # A dated request may have refreshed this journey more recently.
            with self._db() as db:
                db.execute('''INSERT INTO responses VALUES (?,?,?)
                    ON CONFLICT(id) DO UPDATE SET body=excluded.body, saved=excluded.saved
                    WHERE responses.saved < excluded.saved''',
                    (self.cache_key(path, target_params), json.dumps(cached[0]), cached[1]))

    def _blocked(self, identifier):
        with self._db() as db:
            row = db.execute('SELECT until FROM cooldowns WHERE id=?', (identifier,)).fetchone()
        return row[0] if row and row[0] > time() else 0

    def _block(self, identifier, seconds, reason):
        with self._db() as db:
            db.execute('INSERT OR REPLACE INTO cooldowns VALUES (?,?,?)', (identifier, time()+seconds, reason))
            db.execute('DELETE FROM cooldowns WHERE until < ?', (time(),))
            db.execute("DELETE FROM cooldowns WHERE id IN (SELECT id FROM cooldowns WHERE id LIKE 'missing:%' ORDER BY until DESC LIMIT -1 OFFSET 2000)")

    @staticmethod
    def _retry_after(response, default=60):
        raw = response.headers.get('Retry-After', '')
        try:
            return min(2678400, max(1, int(raw)))
        except (ValueError, TypeError):
            try:
                return min(2678400, max(1, int(parsedate_to_datetime(raw).timestamp()-time())))
            except (ValueError, TypeError, OverflowError):
                return default

    @staticmethod
    def _quota_exhausted(response):
        try:
            error = response.json().get('error', {})
            if not isinstance(error, dict):
                return False
            code = str(error.get('code', '')).upper()
            message = str(error.get('message', '')).lower()
            return code in {'QUOTA_EXCEEDED', 'MONTHLY_QUOTA_EXCEEDED', 'MONTHLY_LIMIT_EXCEEDED', 'INSUFFICIENT_QUOTA', 'REQUEST_QUOTA_EXCEEDED'} or (
                ('quota' in message and 'exhaust' in message) or
                ('month' in message and any(word in message for word in ('quota', 'limit', 'allowance'))))
        except (ValueError, TypeError, AttributeError):
            return False

    def _fetch(self, path, params, validate):
        pool = 'pool:' + sha256('|'.join(self.keys).encode()).hexdigest()
        if self._blocked(pool):
            raise HTTPException(503, 'Railway provider is temporarily rate limited. Last saved information may be available.')
        for key in self.keys:
            identifier = sha256(key.encode()).hexdigest()
            if self._blocked(identifier):
                continue
            try:
                response = httpx.get('https://api.railradar.in/v1/' + path,
                    params=params or {}, headers={'Authorization': 'Bearer '+key}, timeout=10)
                if response.status_code == 401:
                    self._block(identifier, 315360000, 'invalid')
                    continue
                if response.status_code == 429:
                    if self._quota_exhausted(response):
                        self._block(identifier, self._retry_after(response, settings.RAILRADAR_QUOTA_COOLDOWN_SECONDS), 'quota')
                        continue
                    self._block(pool, self._retry_after(response), 'throttle')
                    raise HTTPException(503, 'Railway provider is temporarily rate limited. Please wait before refreshing.')
                if response.status_code == 404:
                    raise HTTPException(404, 'No provider record exists for this train or selection.')
                if response.status_code == 403:
                    # An access/plan restriction is not evidence of exhausted quota.
                    self._block(pool, 60, 'access')
                    raise HTTPException(503, 'This railway information is unavailable under the provider configuration.')
                response.raise_for_status()
                payload = response.json()
                data = payload.get('data')
                if payload.get('success') is not True or not isinstance(data, (dict, list)):
                    raise ValueError('Invalid provider envelope')
                if validate:
                    validate(data)
                if path.endswith('/live') and isinstance(data, dict):
                    # Reuse a successful fetch. No collection from cache hits,
                    # quota fallbacks, searches or separate provider requests.
                    from services.eta_observations import record_observation
                    record_observation(data)
                return data
            except HTTPException:
                raise
            except (httpx.HTTPError, ValueError, TypeError, AttributeError):
                self._block(pool, 30, 'unavailable')
                raise HTTPException(503, 'Live railway information is temporarily unavailable. Please retry later.') from None
        raise HTTPException(503, 'Railway API access or quota is unavailable for the configured keys. Last saved information may be available.')

    def request(self, path, params=None, ttl=120, validate=None, stale_ttl=0):
        cache_key = self.cache_key(path, params)
        with self._locks[int(cache_key[:4], 16) % len(self._locks)]:
            cached = self._cached(cache_key)
            if cached and 0 <= time()-cached[1] < ttl:
                return deepcopy(cached[0])
            if self._blocked('missing:'+cache_key):
                raise HTTPException(404, 'No provider record exists for this train or selection.')
            try:
                with self._upstream:
                    data = self._fetch(path, params, validate)
                self.remember(path, params, data)
                return deepcopy(data)
            except HTTPException as error:
                if error.status_code == 404:
                    self._block('missing:'+cache_key, 60, 'missing')
                if error.status_code == 503 and cached and 0 <= time()-cached[1] < stale_ttl:
                    result = deepcopy(cached[0])
                    if isinstance(result, dict):
                        result['_railradar_stale'] = True
                        return result
                raise


_manager = None
_manager_lock = Lock()

def configured_keys():
    return settings.RAILRADAR_API_KEYS or ([settings.RAILRADAR_API_KEY.strip()] if settings.RAILRADAR_API_KEY.strip() else [])

def manager():
    global _manager
    with _manager_lock:
        if _manager is None:
            _manager = RequestManager(settings.RAILRADAR_CACHE_PATH, configured_keys())
        return _manager

def get(path, params=None, ttl=120, validate=None, stale_ttl=0):
    return manager().request(path, params, ttl, validate, stale_ttl)
