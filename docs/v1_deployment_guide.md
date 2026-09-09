# SIH_ETA — Version 1 Deployment & Operations Guide

This guide documents the architecture, configuration, local execution, and cloud deployment procedures for **SIH_ETA Version 1**.

---

## 1. Version 1 Architecture

SIH_ETA V1 operates with a **unified backend architecture**: both the Next.js web application and the Flutter mobile application communicate with the same FastAPI service.

```
                           SIH_ETA V1 ARCHITECTURE
                           
                 [ PUBLIC USERS & OPERATORS ]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   ┌───────────────────┐             ┌───────────────────┐
   │  Next.js Website  │             │ Flutter Mobile App│
   │  (Vercel / Cloud) │             │   (Android APK)   │
   └─────────┬─────────┘             └─────────┬─────────┘
             │                                 │
             │ HTTPS REST & WebSockets         │
             └────────────────┬────────────────┘
                              ▼
               ┌──────────────────────────────┐
               │    FastAPI Unified Backend   │
               │  (Render / Railway / Docker) │
               ├──────────────────────────────┤
               │ • /health & /api/v1/health   │
               │ • /api/v1/stations           │
               │ • /api/v1/trains             │
               │ • /api/v1/network            │
               │ • /api/* (Compat routes)     │
               │ • /ws (Delay telemetry)      │
               └──────────────┬───────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   ┌───────────────────┐             ┌───────────────────┐
   │ Mock Data Client  │             │ Baseline ETA      │
   │ (In-Memory Store) │             │ (Schedule+Delay)  │
   │ 12 Stations       │             │ Fallback Engine   │
   │ 6 Trains, 3 Runs  │             │ Deterministic     │
   └───────────────────┘             └───────────────────┘
```

---

## 2. Environment Variables Reference

### Backend (`backend/.env`)

| Variable Name | Required? | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` or `APP_PORT` | No | `8000` | Port for the HTTP server (Cloud PaaS automatically injects `PORT`) |
| `APP_HOST` | No | `0.0.0.0` | Host binding IP address |
| `APP_ENV` | No | `development` | Set to `production` in live deployments |
| `DEBUG` | No | `false` in prod | Enables/disables debug mode and auto-reload |
| `CORS_ORIGINS` | Yes (in prod) | `http://localhost:3000` | Allowed origins (supports JSON array or comma-separated string) |
| `SUPABASE_URL` | No | `https://demo-project.supabase.co` | Supabase URL (Uses mock client if URL contains "demo") |
| `SUPABASE_ANON_KEY` | No | `demo-anon-key` | Public anon key subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY`| No | `demo-service-role-key` | Secret server-side key (NEVER expose to frontend) |

### Website (`apps/web/web_app/.env.local`)

| Variable Name | Required? | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes (in prod) | `http://localhost:8000/api/v1` | Base REST endpoint for the FastAPI backend |
| `NEXT_PUBLIC_WS_URL` | Yes (in prod) | `ws://localhost:8000/ws` | WebSocket endpoint for real-time delay telemetry |

### Mobile (`apps/mobile/flutter_app/`)

Configured at build-time using `--dart-define`:

| Variable Name | Target Context | Example Command Flag |
| :--- | :--- | :--- |
| `API_BASE_URL` | Cloud / Production | `--dart-define=API_BASE_URL=https://sih-eta-api.onrender.com` |
| `API_BASE_URL` | Android Emulator | `--dart-define=API_BASE_URL=http://10.0.2.2:8000` |
| `API_BASE_URL` | Local PC / Web | `--dart-define=API_BASE_URL=http://localhost:8000` |

---

## 3. Local Development Runbook

### Step 1: Start the Backend
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\backend"
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Health Check*: Open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) or [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) to confirm `status: "healthy"`.

### Step 2: Start the Next.js Web App
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\apps\web\web_app"
npm run dev
```
*Web App URL*: Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 3: Run the Flutter Mobile App
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\apps\mobile\flutter_app"
# For Chrome / Desktop:
flutter run -d chrome
# For Android Emulator:
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

---

## 4. Generic Cloud Deployment (Free Tier Strategy)

### A. FastAPI Backend Deployment (Render.com / Railway)
1. Link your GitHub repository to **Render.com**.
2. Create a new **Web Service**:
   * **Root Directory**: `backend`
   * **Environment**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. In the **Environment Variables** panel, add:
   * `APP_ENV=production`
   * `DEBUG=false`
   * `CORS_ORIGINS=https://your-app-name.vercel.app,http://localhost:3000`
4. Deploy the service. Note the assigned public URL (e.g. `https://sih-eta-api.onrender.com`).

### B. Next.js Website Deployment (Vercel)
1. Link your GitHub repository to **Vercel.com**.
2. Select the repository and configure the project:
   * **Root Directory**: `apps/web/web_app`
   * **Framework Preset**: `Next.js`
3. In the **Environment Variables** panel, set:
   * `NEXT_PUBLIC_API_BASE_URL=https://sih-eta-api.onrender.com/api/v1`
   * `NEXT_PUBLIC_WS_URL=wss://sih-eta-api.onrender.com/ws`
4. Click **Deploy**. Vercel will build and host the website with global edge caching.

### C. Flutter Mobile APK Build
Ensure your local host has JDK 17 configured and Android SDK command-line tools installed:
```powershell
cd "c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\apps\mobile\flutter_app"
flutter build apk --release --dart-define=API_BASE_URL=https://sih-eta-api.onrender.com
```
The output APK is generated at:
`apps/mobile/flutter_app/build/app/outputs/flutter-apk/app-release.apk`
This `.apk` file can be distributed to users or attached to GitHub Releases for direct installation.

---

## 5. Version 1 Scope & Limitations (Honest Disclosure)

| Feature Area | Current V1 Implementation | Version 2 Roadmap |
| :--- | :--- | :--- |
| **ETA Engine** | **Deterministic Baseline**: Scheduled arrival time + uniform current delay. | Machine learning regression model (XGBoost) trained on historical delays. |
| **Database** | **In-Memory Mock Store**: 12 stations, 6 trains, 3 journeys. | Provisioned Supabase PostgreSQL with schema migrations and full dataset import. |
| **Telemetry** | **Simulated Event Stream**: WebSocket broadcasts periodic delay adjustments. | Live IoT / GPS hardware stream integration. |
| **Network Hotspots** | **Simulated Hotspots**: Demonstrates operational dashboard UI. | NetworkX graph analysis for automated bottleneck & conflict detection. |
| **Dataset Store** | **7 Real Processed CSVs**: Located in `railway_eta_data/` (11,821 trains). | Batch ingestion into cloud database. |
