# Deployment and mobile delivery

Audit date: **17 October 2026**. The legacy filename is retained to preserve
links; this guide describes the current Etaernal implementation.

## Verified public entry points

| Service | URL | Audit evidence |
| --- | --- | --- |
| Website | [Dashboard](https://equinox01.vercel.app/dashboard) | Public UI loaded and genuine screenshots captured |
| API | [Health](https://sih-eta-backend-a819.onrender.com/health) | Returned `status: healthy` |
| API schemas | [Swagger](https://sih-eta-backend-a819.onrender.com/docs) / [OpenAPI](https://sih-eta-backend-a819.onrender.com/openapi.json) | Runtime documentation endpoints |
| Trained ETA | [Model diagnostic](https://sih-eta-backend-a819.onrender.com/api/v1/eta/model) | Enabled `eta-gbr-landmark-v1`, `validated_pilot`, trains 12303/12423/12624 |

Availability can change after the audit. Health describes the API process, not
RailRadar quota, map authorization or nationwide model coverage.

## Vercel website

- Project application/root directory: `apps/web/web_app`.
- Install/build: `npm ci`, then `npm run build`; framework Next.js.
- `NEXT_PUBLIC_API_BASE_URL=https://sih-eta-backend-a819.onrender.com/api/v1`.
- `MAPTILER_API_KEY`: browser key authorized for the actual deployment domains.
- Passenger REST views do not require `NEXT_PUBLIC_WS_URL`.

Public-prefixed values are build-time client configuration. MapTiler's runtime
configuration also delivers its browser key to clients, so use provider domain
restrictions. Never add RailRadar, weather or database service-role secrets to
Vercel's public client variables. A rejected key/domain uses the visibly labelled
OpenStreetMap fallback; satellite imagery is not promised by that fallback.

## Render API

- Service: `sih-eta-backend`; backend root directory `backend`.
- Build: `pip install -r requirements.txt`.
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Health check: `/health`.
- Set `APP_ENV=production`, `DEBUG=false`, approved `CORS_ORIGINS` and server-side
  provider keys in the hosting environment.
- Optional OpenWeather aliases and all current settings are listed in
  [local setup](development/setup.md#backend-variables).

The versioned model and evaluation JSON are already in the repository. The API
does not need a training job, Redis instance or Alembic migration to start.
Retain the model eligibility checks when configuring or replacing the artifact.

### Persistence and request budgets

The response cache and sanitized observation archive are SQLite files. On an
ephemeral Render filesystem they can disappear on restart/redeploy; they are
**not a durable training-data collection system**. A reviewed durable storage
setup is required before relying on these files for long-term observations.
Do not provision paid storage/services merely to follow this guide.

The adapter shares responses, suppresses duplicate fetches and backs off after
provider errors/exhaustion. A non-empty `RAILRADAR_API_KEYS` array selects an
ordered pool of authorized allocations. Provider terms/quotas still apply; it
is not an unlimited-request solution.

## Android APK

Source version: **1.1.10+12**. Display name: **Etaernal**. Existing application ID:
`com.siheta.sih_eta` (renaming display text does not change package identity).

Configure the required local signing properties before building; see
[Flutter setup](development/setup.md#flutter). Gallery screenshots retain their
explicit **1.1.9+11** capture version and do not imply newer feedback UI is shown.

```bash
cd apps/mobile/flutter_app
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://sih-eta-backend-a819.onrender.com
```

Generated output: `build/app/outputs/flutter-apk/app-release.apk`, relative to
the Flutter directory. It is a build artifact and stays out of Git.

For an emulator or connected Android device:

```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

For a phone, transfer the reviewed APK and open it with Android's package
installer, approving installation from that source only as needed. Check the
build's signing configuration before distribution; keep keystores/private signing
material outside Git and never label a locally signed demonstration APK as a
store-reviewed release.

Journey insights uses `https://equinox01.vercel.app/journey-insights` by default.
An optional HTTPS `JOURNEY_WEB_BASE_URL` define changes the shared web origin.

No public GitHub release/APK asset was found during this audit. To publish later,
the maintainer should review the APK, signing, version, checksum and release
notes, authorize publication, then add the permanent download link to README.
This documentation change does not publish a release or alter live services.

## Release verification

Run the scoped checks in [CONTRIBUTING.md](../CONTRIBUTING.md). Verify desktop,
narrow-screen and Android selected-train flows after a deployment. Confirm the
source revision, response freshness and per-stop prediction method, and check
map attribution/fallback behavior. A local build or healthy process alone is not
end-to-end live validation.
