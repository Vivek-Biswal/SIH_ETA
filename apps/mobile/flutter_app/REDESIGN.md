# Passenger redesign — 21 September 2026

The Flutter client shares the website's FastAPI backend. The default public API is https://sih-eta-backend-a819.onrender.com. API_BASE_URL remains overridable at build time.

## Implemented
- Blue/white light and blue/black dark themes, plus system mode. Appearance persists locally.
- Journey, Travel tools, Network navigation. Network is an explicitly planned feature with no fabricated metrics or alerts.
- Number lookup, train-name directory, origin/destination search and swap, local history with clear action.
- Sort the current result page by departure, arrival or name. Filter by supplied origin running-day metadata. Unknown running days remain visible; this does not certify that a service operates on the chosen date.
- Scheduled station departure board with explicit absence of live departure/platform data.
- Journey start date selection, refresh/retry, unavailable/stale states, route observations, station map directions.
- Android native share sheet; clipboard sharing fallback on other platforms.
- Android fixed-time station reminders handed to the device clock for review. These are NOT location alarms, do not automatically reschedule, and use the device time zone.
- Orange arrival card: predicted/actual arrival, scheduled arrival, destination arrival difference, separate current running delay and Why this ETA sheet.
- ETA explanation uses the returned method, source, timestamp and reported factors. No weather/congestion cause is inferred from lateness. Time-only schedules have no inferred day offset. Removed the backend's fabricated historical_delay explanation fallback.
- API client rejects demo/mock records. Station directory now includes provenance; mobile rejects an unverified station source.

## Deployment and data requirements
A live HTTP check of Render returned data_source=demo and prediction_method=schedule_only. Its sample delay factors must not be displayed as actual causes. The redesigned app intentionally shows data unavailable for those responses.

New endpoints in the local backend must be deployed before directory/board features can return data:
- GET /api/v1/passenger/lookup?q=...
- GET /api/v1/passenger/departures/{station_code}
These query the existing trains/schedules tables and reject demo storage with HTTP 503. No schema migration or secret is added to the mobile app.

The existing RailRadar client is in railway_eta_data/src/live_api/railradar_client.py. No configured local RailRadar key was found. An optional server adapter now activates when RAILRADAR_API_KEY is configured. It supports live status, station/train lookup, between-station searches and scheduled boards using documented provider contracts. A five-minute freshness limit prevents stale observations from becoming delay-adjusted predictions. Future arrival estimates explicitly carry forward current delay; no model confidence or physical delay causes are invented. Provider failures produce 503 instead of silently falling back to demo records. An actual authorized key and deployment are still required to verify live calls.

Provider reference: https://railradar.in/docs/live-train-status

PNR, fares, availability and coach formations have no configured provider and remain unavailable. True background GPS destination alarms, voice input, multi-day duration sorting and live departure boards are not implemented. Metro and ticket booking were excluded in the references.

## Build
flutter pub get
flutter analyze
flutter test test
flutter build apk --release --dart-define=API_BASE_URL=https://sih-eta-backend-a819.onrender.com

Release signing uses the existing local android/key.properties. Never commit it or the keystore. For Windows desktop plugin setup, Flutter may request Developer Mode for symlink support; Use the normal release build command (without --no-pub) to regenerate release-only plugin registration, and do not run Flutter tests concurrently with the Android build.

## Validation
See VERIFICATION.md for the previous repair baseline. This redesign adds tests in test/redesign_test.dart and backend/tests/unit/test_passenger_tools.py. Test fixtures are confined to tests; they are never shipped as passenger data. Golden files are Flutter widget-test snapshots, whose default test font is Ahem (not the production typography).

Validation before final packaging: Flutter analysis clean; 27 widget/unit tests passed; 37 backend tests passed, including provider payload mapping and stale-data safeguards using fixtures (not authenticated live calls). The signed release APK was installed and launched on the medium_phone Android emulator; light and dark rendering were visually inspected. Native share and clock handoff were compiled but not exercised with a real journey.

Final release SHA-256: 321EC6C0FFE92DF129D4B6BACC2747AA7DFDC195FAC8F94192B0A878060109AA

APK: build/app/outputs/flutter-apk/app-release.apk. Android screenshots: build/verification/redesign-light.png and redesign-dark.png. Backend changes have not been deployed to Render.

