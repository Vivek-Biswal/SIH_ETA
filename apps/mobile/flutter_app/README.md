# SIH ETA passenger app

Flutter passenger app for problem statement 26028. Version 1.1.0 adds an automatic first-launch guide, saved journeys and working Network Intelligence screens.

## Passenger experience

- Four-step welcome guide on first launch, with Skip, Back and Next. Completion stays on the device. Replay from Help or the home help icon.
- Search by number, name or stations. A selected date means the date the train leaves its first station, including overnight journeys.
- Train details preserve the requested date and arrival station. The resolved journey date remains fixed across refreshes.
- Foreground train details checks every 30 seconds. Background or covered screens do not poll. Failed refreshes retain explicitly stale records with separate status/arrival fetch times.
- Save up to 20 journeys with their train, start date and arrival station. Remove and undo from Saved. These are shortcuts, not offline copies or notification subscriptions.
- Light, dark and system themes. Help explains ETA, timetable time, observation freshness, dates and clock reminders.

## Network Intelligence

The Network tab consumes `GET /api/v1/network/insights?q=...&limit=50` from the same backend. It shows:

- The historical observation period and explicit non-live provenance.
- Matching station, interaction and high/critical model-score counts.
- Station bottlenecks ranked by the existing analysis score.
- Recorded source/following-train interactions, dates, delays and gaps.
- Server-side search by station code or train number, station drilldown, and links to the latest train status.
- Loading, retry, empty and stale states; refresh when foregrounded and every minute while visible.

The current repository analysis covers 1–30 September 2024: 447 stations and 60,126 interactions. It is **not current congestion, confirmed disruptions, calibrated probabilities or proof of causation**. The app does not turn these records into live alerts. Deploy the new backend endpoint before distributing the production APK; older servers show a clear unavailable state.

## API and prediction limits

The default API root is `https://sih-eta-backend-a819.onrender.com`. Override with `--dart-define=API_BASE_URL=...` when building. Database/provider secrets stay on the backend.

Train status and ETA must match both train number and journey date. Demonstration records are rejected. Schedule-only responses remain labelled as schedules. The currently verified live provider uses an observed-delay baseline: scheduled arrival plus the latest delay. Trained ETA using congestion, weather, restrictions and measured prediction accuracy remains separate backend work.

Station boards are timetables, not live platform/departure guarantees. Published running-day filtering does not certify operation. Database fallback route search supports terminal endpoints; provider coverage can differ.

## Verify

```powershell
flutter analyze
flutter test test
```

Tests cover onboarding persistence/replay, saved journeys and undo, date/station navigation, polling lifecycle, stale partial refreshes, malformed API data, historical network provenance/search, themes and narrow screens with enlarged text.

Device test, with the updated backend running on port 8091 on the same computer:

```powershell
flutter test integration_test/passenger_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:8091
```

## Build an APK

```powershell
flutter build apk --release --target-platform android-arm64,android-x64 --dart-define=API_BASE_URL=https://sih-eta-backend-a819.onrender.com
```

Output: `build/app/outputs/flutter-apk/app-release.apk`. This includes ARM64 phones and x64 emulators. Release signing uses the existing local `android/key.properties`; never commit it or the keystore. Release networking requires HTTPS. The app retains its existing Android launcher name, Equinox.
