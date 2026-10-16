# Etaernal mobile

Flutter passenger application, version **1.1.10+12**. Requires Flutter 3.32+
and Dart 3.8.1+; Android application ID remains `com.siheta.sih_eta`.

## What is implemented

- First-run passenger guide and replayable onboarding.
- Native train-number/name search, station-pair search, train details, route
  timeline and selected-station ETA from the shared backend.
- Station-specific explanations, signed early/late duration, measured recovery
  and separately labelled possible future recovery.
- Saved journeys (up to 20, local preferences), appearance settings and sharing.
- Native historical station/network analysis.
- Journey insights parity through an Android/iOS **WebView** of the deployed
  workspace: tracking/map, analytics/CSV sharing, past delays and simulation.
- A phone-clock handoff for user-confirmed alarms; no automatic ETA push alerts.
- Native ETA feedback with local pending storage, retry and server receipt;
  reports remain unverified and are not model-training labels.

The trained ETA is the same limited three-train pilot used by the website, not
a separate on-device model. WebView features require network access and the
deployed website. Non-mobile platforms open the workspace externally.

## Run and verify

The Android Gradle configuration currently requires local `android/key.properties`
and a keystore during configuration, even for debug builds. Configure them using
the [Flutter setup guide](../../../docs/development/setup.md#flutter) first.

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
flutter analyze
flutter test
```

Use `http://localhost:8000` for an iOS simulator; on a physical phone use the
development computer's LAN address and ensure it can reach the API. Android
cleartext restrictions and HTTPS deployment are discussed in the
[setup guide](../../../docs/development/setup.md).

`API_BASE_URL` is the backend **root**, without `/api/v1`. The app derives both
the versioned and legacy prefixes in `lib/core/config/api_config.dart`.
There is no runtime `.env` loader. Never put RailRadar, weather or service-role
keys in Flutter defines or the APK.

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://sih-eta-backend-a819.onrender.com
```

Output: `build/app/outputs/flutter-apk/app-release.apk`. Build/review signing
before public distribution; there is no public release asset currently linked.

Optional `JOURNEY_WEB_BASE_URL` changes the shared workspace origin at build
time; it must be HTTPS. MapTiler stays configured on the website—no private map
configuration needs to be duplicated in Flutter.

[Project overview](../../../README.md) · [Screenshots](../../../docs/screenshots/README.md) ·
[Deployment](../../../docs/v1_deployment_guide.md) · [ETA audit](../../../docs/ETA_ML_AUDIT.md)

The gallery records Android 1.1.9+11. The subsequent 1.1.10+12 arrival-selection
and feedback change is documented in [the delivery note](../../../docs/MOBILE_ETA_FEEDBACK.md).
