# SIH ETA mobile app

The existing Flutter passenger app uses Riverpod, GoRouter and the FastAPI backend. It has two routes: train search (`/`) and train details (`/trains/:id`). The larger SCREEN_MAP is a design reference, not a list of implemented screens.

## Run the backend

From the repository's backend directory, using its existing Python environment:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend Supabase configuration remains on the server. A URL containing `demo` selects the existing sample database client; this is explicitly labelled **Demo data** in the app. To intentionally run the demo without using configured database credentials:

```powershell
$env:SUPABASE_URL = 'https://demo-project.supabase.co'
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The mobile app does not contain database credentials or a separate train dataset. Passenger endpoints currently require no login. The health endpoint establishes API availability, not database or telemetry freshness.

## Configure and run Flutter

From this directory:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`API_BASE_URL` is the backend **root**, without `/api` or `/api/v1`. It is a compile-time setting; changing it requires rebuilding/restarting the app. A mobile `.env` file is not loaded.

| Target | Backend root |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` (default) |
| Physical Android phone | Your development computer's LAN IPv4 address and port |
| Windows / browser on the backend computer | `http://127.0.0.1:8000` |
| Deployed build / iOS | Your accessible HTTPS backend root |

For a physical phone, use the same network, bind the development server to `0.0.0.0`, and permit the selected port through the host firewall. Do not use emulator-only `10.0.2.2` on a physical phone.

Legacy full-prefix overrides `API_URL` (`/api`) and `API_URL_V1` (`/api/v1`) remain supported. Normally only set `API_BASE_URL`.

Android has internet permission in all builds. Debug/profile builds permit development HTTP; release builds require HTTPS. macOS has outgoing-network entitlements. iOS transport settings are unchanged; use HTTPS rather than globally disabling ATS. CORS concerns browser builds, not native Android HTTP requests. Configure the backend's existing `CORS_ORIGINS` with the actual browser origin if testing Flutter web.

## Passenger flow and contracts

- Enter a five-digit train number, or select origin/destination stations from the server directory.
- Endpoint search supports paginated scheduled services. It is not arbitrary intermediate-station search or a list of currently running trains.
- Open details to fetch status, then ETA for the same returned journey date.
- View identity, latest recorded running status/delay, observation time, destination arrival and ordered route.
- Pull to refresh, use the refresh/retry action, or return to the foreground to refresh.
- Partial failures retain useful data. Failed refreshes explicitly mark retained content stale. There is no disk-backed offline cache.

The app consumes:

| API | Usage |
| --- | --- |
| `GET /api/v1/stations/search?q=...` | Station selection; at least two characters |
| `GET /api/v1/trains/search?from_station=...&to_station=...&page=...&limit=20` | Scheduled services and pagination |
| `GET /api/v1/trains/{number}/status` | Journey date, observations, status, route |
| `GET /api/v1/trains/{number}/eta?date=...` | Arrival estimates for the same journey |

The compatibility summary `/api/trains/{number}/eta` is deliberately not parsed as the versioned station-level response. Existing compatibility endpoints remain available to other clients.

## Data interpretation

New additive backend fields:

- `data_source`: `demo`, `database`, or `unknown` on search/status/ETA responses. Database provenance does not imply live telemetry.
- `prediction_method`: `schedule_only`, `stored`, `inference`, or `unknown` on ETA responses. Derived from the actual service branch, not the model-version label.

Older servers without metadata show unverified provenance. The legacy schedule-only branch keeps its original response fields for compatibility, but the mobile app labels these values **Scheduled arrival** and says an adjusted prediction is unavailable. It does not calculate another prediction on the phone or present placeholder confidence as measured accuracy.

Status route order is authoritative. Predictions are matched by unique station code for the same journey; ambiguous repeated stations are not guessed. Unknown progress, platform and timestamps remain unavailable. Observation timestamps older than five minutes are marked old; fetch time is separate. Zoned timestamps display in IST, while time-only schedules retain their supplied value without an invented date.

Mock/seeded observations and unavailable trained forecasting remain backend limitations. This repair does not add a live railway feed, ML model, authentication, background push notifications or other planned screens.

## Verify

```powershell
flutter analyze
flutter test test
```

Unit/widget tests use injected transports/repositories. They cover contract mismatches, nullable fields, route ordering, ambiguous stops, journey dates, HTTP failures, timeouts, unknown provenance, navigation, selected endpoints, loading, retry, stale refresh and narrow layouts with enlarged text.

The Android integration test requires the existing demo backend (train 12301, HWH–NDLS) and an emulator:

```powershell
flutter test integration_test/passenger_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

It exercises real FastAPI station search, train search, status and ETA, plus a deliberately interrupted HTTP transport, recovery, refresh and a nonexistent train. It does not claim live railway telemetry verification.

Backend regressions:

```powershell
$env:SUPABASE_URL = 'https://demo-project.supabase.co'
.\venv\Scripts\python.exe -m pytest tests -q -p no:cacheprovider
```

## Build

For most physical Android phones, an ARM64 debug APK avoids a large universal build:

```powershell
flutter build apk --debug --target-platform android-arm64 --dart-define=API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000
```

For the emulator, use `--target-platform android-x64` and the emulator host URL. Supply the actual LAN address or HTTPS server before distributing a phone APK.

Output: `build/app/outputs/flutter-apk/app-debug.apk`.

A release build requires your HTTPS backend URL and proper release signing. The existing Gradle project still uses debug signing for release; this task does not provision store credentials. iOS packaging requires macOS/Xcode and separate device verification.

If a universal APK build exhausts disk space, `flutter clean` removes this app's generated outputs. Then resolve dependencies and build only the required architecture. Do not delete unrelated source data or global caches.