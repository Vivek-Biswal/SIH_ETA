# Local setup and verification

Run commands from the directories shown. This guide describes the current
passenger implementation, not the original PostgreSQL/Redis/JWT proposal.

## Prerequisites

| Component | Requirement |
| --- | --- |
| All work | Git and a terminal; clone the repository rather than copying build outputs |
| API | Python 3.11+; Python 3.12 recommended for a new environment |
| Website | Node.js 20.9+ and npm; use `package-lock.json` |
| Mobile | Flutter 3.32+ / Dart 3.8.1+, Android SDK and compatible Java/Gradle tooling; check `flutter doctor -v` |
| Optional model training | Separate Python 3.12 environment with pinned training requirements |

```bash
git clone https://github.com/Vivek-Biswal/SIH_ETA.git
cd SIH_ETA
```

## Backend

**Terminal 1, from the repository root:**

```bash
cd backend
python -m venv .venv
```

Activate it using the appropriate shell:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
```

```bash
# macOS/Linux
source .venv/bin/activate
cp .env.example .env
```

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend reads `.env` from the working directory, so start it inside
`backend/`. Restart it after changing local settings. The root `.env.example`
is a configuration index, not a shared application environment.

### Backend variables

| Variable | Required? | Purpose |
| --- | --- | --- |
| `RAILRADAR_API_KEY` | For provider-backed running data | Private server-side key; never place it in client code |
| `RAILRADAR_API_KEYS` | Optional | JSON array of up to 32 authorized keys; replaces the single-key setting when non-empty. Ordered failover, not random rotation; provider limits/terms still apply. |
| `WEATHER_API_KEY` | Optional | OpenWeather forecast; `OPENWEATHER_API_KEY` and `OPENWEATHERMAP_API_KEY` are accepted aliases |
| `CORS_ORIGINS` | For browser access | JSON array recommended, e.g. `["http://localhost:3000","http://localhost:8080"]` |
| `RAILRADAR_LIVE_CACHE_SECONDS` | Optional; default 120 | Shared live-response cache, bounded to 30–300 seconds |
| `RAILRADAR_CACHE_PATH` | Optional | SQLite response cache/cooldowns, relative to backend working directory by default |
| `RAILRADAR_QUOTA_COOLDOWN_SECONDS` | Optional; default 86400 | Conservative retry delay if explicit quota exhaustion has no provider reset time |
| `ETA_ML_ENABLED` | Optional; default true | Enables qualified learned inference; false uses the existing explicit fallback |
| `ETA_MODEL_PATH` | Optional | Defaults to checked-in `data/eta_ml/model.json` |
| `ETA_HISTORY_PATH` | Optional | Local sanitized observation archive, default `data/eta-observations.sqlite3` |
| `ETA_FEEDBACK_PATH` | Optional | Unverified passenger-report storage; default `data/eta-feedback.sqlite3`; not automatically durable |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Optional | Real directory/schedule database path; service-role key is backend-only |
| `PORT` / `APP_PORT`, `DEBUG`, `APP_ENV` | Optional | Application settings; the explicit uvicorn command controls its own host/port/reload flags |

Use real keys only in ignored `.env` files or the hosting secret store. The
backend's demo Supabase defaults select an in-memory client; they do **not**
provide verified passenger data. Without RailRadar or a real database, some
requests correctly return unavailable rather than sample arrivals.

### Database boundary

There is **no mandatory local database migration** in this startup path. The
current passenger provider and JSON model can run without PostgreSQL or Redis.
Supabase repository adapters are optional. If using that path, provision a real
project and review the expected tables/repository queries and RLS policies with
the maintainer before importing data; the [database document](../database/database-design.md)
is an earlier design, not a tested one-command schema bootstrap. Do not run an
invented `alembic upgrade head` or seed command.

### Check startup without spending provider requests

Open [health](http://localhost:8000/health),
[runtime API docs](http://localhost:8000/docs) and
[model status](http://localhost:8000/api/v1/eta/model). A healthy API does not
prove a railway key is configured or has quota remaining.

## Website

**Terminal 2, from the repository root:**

```bash
cd apps/web/web_app
npm ci
```

```powershell
# PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS/Linux
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
MAPTILER_API_KEY=
```

```bash
npm run dev
```

Open [localhost:3000/dashboard](http://localhost:3000/dashboard). The example
otherwise defaults to the hosted backend. Use a local API for development so
you do not accidentally spend the demo service's limited allocation.

MapTiler is optional: use a **browser key** authorized for `localhost` and your
deployment hostname. The runtime `/api/maps/config` endpoint delivers it to the
browser; the key is not a server-only secret. Rejected/missing map configuration
falls back to OpenStreetMap with attribution. RailRadar and weather secrets
must never use `NEXT_PUBLIC_*`. Passenger tracking uses REST polling; the
optional `NEXT_PUBLIC_WS_URL` is not required by the dashboard.

## Flutter

The current Android Gradle file eagerly reads the release signing properties,
so even a debug run needs **local signing configuration**. Do not request or
commit a maintainer's private key. Generate your own development keystore (Java
`keytool` must be on PATH), or use an authorized private signing setup.

```powershell
# PowerShell: keep the private keystore outside the repository.
New-Item -ItemType Directory -Force "$env:USERPROFILE/.etaernal-signing"
keytool -genkeypair -v -keystore "$env:USERPROFILE/.etaernal-signing/etaernal-release.jks" -alias etaernal -keyalg RSA -keysize 2048 -validity 10000
```

```bash
# macOS/Linux equivalent:
mkdir -p "$HOME/.etaernal-signing"
keytool -genkeypair -v -keystore "$HOME/.etaernal-signing/etaernal-release.jks" -alias etaernal -keyalg RSA -keysize 2048 -validity 10000
```

Choose passwords interactively, then create the ignored file
`apps/mobile/flutter_app/android/key.properties` with your own values:

```properties
storePassword=YOUR_LOCAL_STORE_PASSWORD
keyPassword=YOUR_LOCAL_KEY_PASSWORD
keyAlias=etaernal
storeFile=/ABSOLUTE/PRIVATE/PATH/etaernal-release.jks
```

Use forward slashes for a Windows absolute `storeFile`, such as
`C:/Users/YOUR_USER/.etaernal-signing/etaernal-release.jks`. Never commit this
file or keystore. A build signed with your key cannot update an installed APK
signed with someone else's key. Debug builds use the separate `.debug` package
ID so testing need not replace the signed passenger application.

**Terminal 3, from the repository root:**

```bash
cd apps/mobile/flutter_app
flutter doctor -v
flutter pub get
flutter devices
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

| Target | Backend root define |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical phone | Development computer's LAN address, or an HTTPS backend |
| Hosted demo | `https://sih-eta-backend-a819.onrender.com` |

Unlike the website, `API_BASE_URL` has **no `/api/v1` suffix**. The app derives
the correct prefixes itself. Flutter does not load a `.env` file at runtime.
For a physical phone, bind the local API to `0.0.0.0`, allow its port through
the local firewall and keep both devices on the same reachable network.
Android release builds should use HTTPS; local cleartext rules are not a reason
to disable transport security for public distribution.

The native train screens use the API directly. Journey insights opens the shared
HTTPS web workspace through a mobile WebView. `JOURNEY_WEB_BASE_URL` can change
its origin at build time; this does not automatically follow a local API define.
MapTiler configuration belongs to that website, not in a Flutter secret.

## Verification

Tests should not spend real provider quota. Run backend tests in a clean shell
with RailRadar keys unset and the demo Supabase defaults. If testing locally
with real settings elsewhere, keep those in a separate shell/environment.

```bash
# From backend/, with the API virtual environment active:
python -m pip install -r requirements-test.txt
python -m pytest tests/ -q
```

```bash
# From apps/web/web_app/:
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

```bash
# From apps/mobile/flutter_app/:
flutter analyze
flutter test
```

```bash
# From the repository root (backend test environment is sufficient):
python -m pytest intelligence/tests/test_public_history_import.py intelligence/tests/test_eta_training_contract.py -q
python scripts/check_docs.py
```

The website currently has no `npm test` or `type-check` script. Its legacy
`npm run lint` uses `next lint`; invoke `npx eslint .` for direct lint inspection.
Known lint debt is not evidence that a build/test command exists.

## Optional offline training

Running the application **does not require retraining or downloading data**.
To reproduce the experiment, use a separate Python 3.12 virtual environment.
Review [data provenance and reuse conditions](../DATA_SOURCES.md) first.

```bash
# From repository root, with a separate training environment activated:
python -m pip install -r intelligence/train_eta/training/requirements.txt
python intelligence/train_eta/data/import_public_history.py
python intelligence/train_eta/training/train.py --output tmp/eta-reproduction
python intelligence/train_eta/training/audit_policy.py --output tmp/eta-reproduction
```

The default importer downloads the bounded three-train sample at a pinned
revision. Outputs remain ignored. Using a temporary output directory preserves
the shipped artifact; compare reports before proposing a model replacement.
Do not tune on final-test errors or claim better accuracy without a fresh,
independent evaluation. See [the ML audit](../ETA_ML_AUDIT.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Healthy API, but no trains | Provider key/quota or real database coverage. Demo storage is not verified live data. |
| 429 / quota unavailable | Allow backoff; use shared cache and fewer refreshes. Pool only provider-authorized allocations. Do not loop/redeploy to bypass limits. |
| Browser CORS error | Exact frontend origin in backend `CORS_ORIGINS`, including scheme/port; restart API. |
| Wrong journey or stale arrival | Origin date, returned identity, report timestamp and per-stop method. Do not compare a multi-day train against today's unrelated departure. |
| “Invalid key” on map | MapTiler browser-key validity/domain allowlist; inspect Map options. Preserve the identified fallback. |
| Phone cannot reach localhost | Use Android emulator `10.0.2.2` or a reachable LAN/HTTPS address. |
| ML fallback on a pilot train | A fresh confirmed station event, supported pair/horizon and valid features are also required. `/api/v1/eta/model` is artifact status, not proof every stop used ML. |
| Python scientific-library import/DLL error | Use the pinned training stack in a separate supported Python 3.12 environment. Runtime JSON inference does not need it. |
| Flutter SDK/plugin registration mismatch | Check `flutter doctor -v`, SDK consistency and generated plugin registration. Do not promote test-only integration plugins into production dependencies. |
| OneDrive/build file errors | Ensure files are fully downloaded and toolchains accessible; prefer a local materialized clone for large build caches. |

Stop local foreground services with `Ctrl+C` in their terminals. Development
servers are not production deployments.
