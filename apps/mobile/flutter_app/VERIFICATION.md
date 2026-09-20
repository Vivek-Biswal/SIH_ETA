# Mobile repair verification — 2026-09-20

The existing Flutter passenger app was repaired in place. FastAPI's existing architecture and compatibility routes were retained. No changes were made to the untracked railway source data.

## Verified results

| Check | Result |
| --- | --- |
| Flutter 3.32.8 / Dart 3.8.1 dependency resolution | Passed |
| `flutter analyze` | No issues |
| `flutter test test` | 19 passed |
| Backend `python -m pytest tests -q -p no:cacheprovider` | 28 passed; existing deprecation warnings remain |
| Android integration test against FastAPI | 1 passed on emulator-5554 (sdk gphone64 x86 64) |
| Normal Android debug app build and launch | Passed |
| ARM64 phone debug APK | Built successfully |
| Git whitespace check | Passed |

The Android test exercised actual HTTP requests to FastAPI: station selection, HWH–NDLS search, train 12301 details, status, schedule-only arrival information, route, refresh, a deliberate client-transport disconnect, recovery, and nonexistent train 99999. Demo responses were visibly labelled. Unit/widget tests additionally cover malformed/nullable contracts, 404/422/500, timeouts, stale refresh, partial failures, wrong journey dates, ambiguous repeated stations and 320-pixel layouts at 2x text scale.

## APK and connection

Artifact: `build/app/outputs/flutter-apk/app-arm64-v8a-debug.apk`

Size: 46,231,937 bytes (about 44.1 MiB).

SHA-256: `2B16B0EE54A69723FC0B968D7204285154C23B12E14E2694B6763A5D57654B79`

Build command:

```powershell
flutter build apk --debug --target-platform android-arm64 --split-per-abi --dart-define=API_BASE_URL=http://192.168.1.24:8090
```

This APK targets the development computer's current Wi-Fi address, **192.168.1.24:8090**. A phone must share its network and be able to reach that port. Keep FastAPI running on `0.0.0.0:8090`. If the computer's address changes, rebuild with the new address. No firewall rules were changed. The physical phone itself was not available for testing.

The emulator used `http://10.0.2.2:8090`. Native visual captures are in `build/verification/`. Build outputs are ignored by Git; source and commands remain reproducible.

## Root causes corrected

- Flutter parsed the compact compatibility ETA response as the versioned station-level response. It now consumes the verified v1 contracts and fetches status and ETA for the same journey.
- Search used fixed endpoints and read nonexistent live/ETA fields. The home screen now selects real backend stations, paginates scheduled services and opens actual train details.
- Hardcoded arrival times, current-station highlighting and ML/high-confidence claims were removed.
- Nullable/malformed payloads, retry, partial failure, stale content, foreground refresh and safe navigation are handled explicitly. HTTP clients are injectable and disposed.
- Backend metadata identifies source and actual prediction branch without changing legacy fields.
- The mock database null filter crashed ETA requests; its tuple shape is fixed. Demo train search also now supplies the same station-reference joins as the database-backed query.
- Three existing network compatibility tests expected mock scenario results while the factory selected unfinished real providers. Those tests now explicitly inject their intended mock network provider; production provider selection is unchanged.
- Android release internet permission was absent. Main permission and debug/profile development HTTP configuration are now explicit; macOS client-network entitlements are present.
- Runtime-fetched fonts were replaced by offline-safe system typography. The unused font dependency and its generated plugin registration were removed.

## Limits and environment notes

- Verification used the backend's existing mock database, not a live railway feed or production Supabase records. Trained forecasting, continuous ingestion and calibrated confidence remain outside this mobile repair.
- Schedule-only fallback values remain scheduled arrival times with delay reported separately. The mobile app does not invent adjusted ETAs or dates for time-only values.
- No disk-backed offline cache, new authentication, push notification service or additional planned dashboard screens were added.
- iOS/macOS/Windows packaging and store signing were not verified. iOS should use HTTPS. Existing release signing still uses the development key.
- The first universal APK build exhausted C: drive cache space. Only this app's generated outputs were cleaned, then architecture-specific builds succeeded. No unrelated caches or user data were deleted.
- The emulator briefly displayed Android system/System UI wait dialogs after native builds. They were dismissed and the normal app was restarted for the unobstructed screen check; the automated passenger flow passed.

## Changed files

Paths below are relative to the repository root. See README.md for configuration and reproduction commands.

- `apps/mobile/flutter_app/README.md`
- `apps/mobile/flutter_app/VERIFICATION.md`
- `apps/mobile/flutter_app/android/app/src/debug/AndroidManifest.xml`
- `apps/mobile/flutter_app/android/app/src/main/AndroidManifest.xml`
- `apps/mobile/flutter_app/android/app/src/profile/AndroidManifest.xml`
- `apps/mobile/flutter_app/integration_test/passenger_flow_test.dart`
- `apps/mobile/flutter_app/lib/core/config/api_config.dart`
- `apps/mobile/flutter_app/lib/core/models/journey_view.dart`
- `apps/mobile/flutter_app/lib/core/models/train_models.dart`
- `apps/mobile/flutter_app/lib/core/network/api_client.dart`
- `apps/mobile/flutter_app/lib/core/services/mock_mobile_data.dart`
- `apps/mobile/flutter_app/lib/core/services/train_repository.dart`
- `apps/mobile/flutter_app/lib/core/theme/app_theme.dart`
- `apps/mobile/flutter_app/lib/core/theme/app_typography.dart`
- `apps/mobile/flutter_app/lib/features/home/home_screen.dart`
- `apps/mobile/flutter_app/lib/features/train_details/train_details_screen.dart`
- `apps/mobile/flutter_app/lib/main.dart`
- `apps/mobile/flutter_app/lib/shared/widgets/eta_display.dart`
- `apps/mobile/flutter_app/lib/shared/widgets/passenger_components.dart`
- `apps/mobile/flutter_app/lib/shared/widgets/station_timeline.dart`
- `apps/mobile/flutter_app/macos/Flutter/GeneratedPluginRegistrant.swift`
- `apps/mobile/flutter_app/macos/Runner/DebugProfile.entitlements`
- `apps/mobile/flutter_app/macos/Runner/Release.entitlements`
- `apps/mobile/flutter_app/pubspec.lock`
- `apps/mobile/flutter_app/pubspec.yaml`
- `apps/mobile/flutter_app/test/api_contract_test.dart`
- `apps/mobile/flutter_app/test/fixtures.dart`
- `apps/mobile/flutter_app/test/passenger_flow_test.dart`
- `backend/database/mock_client.py`
- `backend/models/schemas/trains.py`
- `backend/repositories/train_repository.py`
- `backend/services/eta_service.py`
- `backend/services/train_service.py`
- `backend/tests/integration/test_api.py`
- `backend/tests/unit/test_passenger_metadata.py`
