# Etaernal 1.1.11: navigation and Journey Insights

Verified on 17 October 2026. This release changes navigation and presentation;
the ETA models, railway providers, map configuration and simulation calculations
are unchanged.

## Navigation

Bottom destinations now push screens onto navigation history instead of replacing
the current screen. Selecting the current destination adds no duplicate page.
Existing route URLs are preserved, with Search as the ancestor for direct routes.
AppBar Back and Android Back return to the previous screen, retaining form values
and scroll position. At the root, Android handles Back normally.

Journey Insights first traverses its WebView tool history, then returns through
native history. Train links open native details with the selected journey date.
Returning keeps the workspace and its selected tool. Polling pauses when a native
screen covers the workspace or the application moves into the background.

## Journey Insights

The app uses one tool selector for Track my train, Past delays, Simulation and
Analytics. Its embedded presentation removes duplicate headings and selectors,
uses consistent cards and full-width forms, and follows the app's appearance.
Visited tools retain their train inputs and scenario state. Hidden tools stop
their effects; maps are recreated when shown to avoid stale Leaflet instances.

Past delays initially shows five stations and five interactions. Show More reveals
already-loaded records without an API request. A new search resets those counts.
The regular website retains its full lists. Refresh, CSV sharing, native historical
analysis and browser recovery remain available from the app.

## Validation

- `flutter analyze --no-pub`: no issues.
- `flutter test --no-pub`: 123 unit and widget tests passed.
- Web `node --test tests/*.test.mjs`: 70 tests passed against staged source, with
  unrelated in-progress Alerts changes excluded.
- `npm run build`: production compilation, TypeScript and page generation passed
  for that same staged web source.
- The emulator-only host harness passed with actual Android Back key events,
  committed edge swipes, visible AppBar Back, dialog dismissal and retained Search
  input. Its fixture supplies controlled train data and uses the separate
  `.debug` application; it makes no RailRadar requests.
- Browser checks covered light/dark presentation, 320/390-pixel layouts, retained
  train input after tool Back, and loaded historical records. No train lookup was
  submitted during those visual checks.

Reproduce the real Android check from the repository root in PowerShell:

```powershell
python scripts/verify_android_back.py --device emulator-5554 --adb C:/Users/Lenovo/AppData/Local/Android/Sdk/platform-tools/adb.exe --flutter C:/src/flutter/bin/flutter.bat
```

The harness accepts only emulators, checks keyboard visibility before route Back,
enables real touch input and live frames, and restores the original Android
navigation overlays. Logs and screenshots are saved under
`apps/mobile/flutter_app/build/navigation-back/`. Passing run: `b8c9e40f6a90`.
Cancelled predictive gestures and physical-phone coverage are not claimed.

## Signed APK

- File: `apps/mobile/flutter_app/build/app/outputs/flutter-apk/Etaernal-1.1.11.apk`
- Package: `com.siheta.sih_eta`; version `1.1.11`, Android version code `13`.
- Flutter runtime targets: `arm64-v8a` and `x86_64`; minimum Android SDK 21.
- Size: 17,195,606 bytes.
- SHA-256: `57dd82c72e2d4cd68af0f7fb1a9b2464ed1b851898d51cd4567ea47491eadb64`.
- APK signature verified. The certificate matches the existing 1.1.10 artifact.
- `adb install -r` succeeded on the emulator; installed version 1.1.11/code 13
  was confirmed without clearing app data. First-launch onboarding also opened.

Build from `apps/mobile/flutter_app` using the existing local release signing
configuration (never commit `android/key.properties` or its keystore):

```powershell
flutter build apk --release --target-platform android-arm64,android-x64 --dart-define=API_BASE_URL=https://sih-eta-backend-a819.onrender.com
```

The local SDK reports a plugin NDK-version recommendation; the signed build and
Android integration test both completed successfully with the installed SDK.
