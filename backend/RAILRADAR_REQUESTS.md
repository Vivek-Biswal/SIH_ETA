# RailRadar request budget

The app and website use one backend provider adapter. Only the backend reads keys.
No database service or paid infrastructure is provisioned for these changes.

## Render configuration

Keep the existing `RAILRADAR_API_KEY` for one key, or add one JSON array variable:

```
RAILRADAR_API_KEYS=["first-authorized-key","second-authorized-key"]
```

The array replaces the single key when non-empty. The first eligible key is used
until an explicit quota-exhaustion response or an invalid-key response disables
it. The next eligible key is then tried in array order. Selection is deterministic,
not random and not round robin. A temporary or ambiguous HTTP 429 pauses the
whole pool according to `Retry-After`; it does not rotate keys. A 403 permission
failure is not interpreted as quota exhaustion. Check RailRadar's permission for
pooling allocations: extra keys do not themselves increase an account's quota.

Save and deploy once after configuring the array. Automatic failover during
normal operation needs no environment edits or redeployment. Adding/replacing
keys later requires reloading the backend environment.

Known exhausted allocations are skipped until the provider's `Retry-After`, or
`RAILRADAR_QUOTA_COOLDOWN_SECONDS` (default one day) when no reset is provided.
That fallback is a retry time, not an assumed billing reset. Invalid keys are
disabled; replacing a key gives it a new identity. Errors never expose a key or
provider response body. SQLite stores SHA-256 identifiers, not credentials.

## Caching and refresh

* Live observations: 120 seconds, adjustable from 30 to 300 seconds with
  `RAILRADAR_LIVE_CACHE_SECONDS`. Automatic app and website polls run every two
  minutes; manual refresh also respects the server cache.
* Searches/directories: 24 hours. Timetables and between-station searches: six
  hours, including reuse across result pages. Date-less between-station searches
  resolve to the current date in India.
* Missing records (404) are remembered for 60 seconds to avoid repeated invalid
  selections hitting the provider. This cache does not substitute an old record.
* Identical concurrent misses are combined inside one backend process. An
  undated status response is also cached under its verified journey start date,
  so the following ETA/weather calls reuse it.
* During an upstream failure, a saved train observation can be shown for up to
  six hours. It is explicitly classified as cached and cannot produce a fresh
  ETA, regardless of its original provider flags. Original timestamps remain.

`RAILRADAR_CACHE_PATH` defaults to `data/railradar-cache.sqlite3`. Cache size is
bounded to 2,000 responses. SQLite persists cache/cooldowns through process
restarts on the same filesystem. Render's default ephemeral filesystem is reset
on deployments/replacements. For durable storage across deployments, point this
variable at an existing persistent disk. A shared Redis cache would be appropriate
if the backend later runs on multiple machines; the current single-service setup
does not require it. Per-process request coalescing does not span machines.

## Validation

Tests use fake credentials and mocked provider responses. They cover ordered
failover, temporary rate limiting, exhausted-pool circuits, invalid credentials,
cache reuse/coalescing, SQLite restarts, response validation and stale fallback.
Live RailRadar quota is not consumed by these tests.
