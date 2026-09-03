# Development Setup Guide

## Prerequisites

Install these tools before starting. Versions listed are minimum requirements.

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| Flutter SDK | 3.x | [flutter.dev](https://flutter.dev/docs/get-started/install) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 16+ | [postgresql.org](https://postgresql.org) |
| Redis | 7.x | [redis.io](https://redis.io/download) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

---

## 1. Clone & Configure

```bash
git clone https://github.com/Vivek-Biswal/SIH_ETA.git
cd SIH_ETA

# Copy the environment template
cp .env.example .env
# Open .env and fill in your local credentials
```

---

## 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Set up the database (requires PostgreSQL to be running)
# Create DB: psql -U postgres -c "CREATE DATABASE sih_eta_db;"
alembic upgrade head

# Seed sample data (optional but recommended for dev)
python -m database.seed.seed_sample_data

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 3. Flutter Mobile App Setup

```bash
cd apps/mobile/flutter_app

# Install Dart/Flutter dependencies
flutter pub get

# Create the env config (Flutter uses dart-define or a .env package)
# See lib/core/config/app_config.dart for details

# Run on connected device or emulator
flutter run

# Run tests
flutter test

# Build APK (Android)
flutter build apk --release
```

---

## 4. Web App Setup (Next.js)

```bash
cd apps/web/web_app

# Install Node.js dependencies
npm install

# Copy environment variables for Next.js
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_WS_URL

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

- Web app: `http://localhost:3000`

---

## 5. Intelligence Module Setup

```bash
cd intelligence

# Create and activate a separate virtual environment
python -m venv venv
source venv/bin/activate

# Install ML dependencies
pip install -r requirements.txt

# For development/testing with sample data:
# Data for training should be in data/sample/ (version controlled)
# Real raw data goes in data/raw/ (Git-ignored, managed separately)

# Run feature engineering pipeline (sample data)
python -m train_eta.features.build_features --input ../../data/sample/ --output ../../data/processed/

# Train the model (sample data only for dev, not production)
python -m train_eta.training.train --config train_eta/training/config.yaml

# Run inference tests
python -m pytest tests/
```

---

## 6. Running Everything Together

For a full local development environment, you need:

| Service | Port | Start command |
|---|---|---|
| PostgreSQL | 5432 | System service or `pg_ctl start` |
| Redis | 6379 | `redis-server` |
| Backend API | 8000 | `uvicorn main:app --reload` (in `backend/`) |
| Web Dashboard | 3000 | `npm run dev` (in `apps/web/web_app/`) |
| Flutter App | device | `flutter run` (in `apps/mobile/flutter_app/`) |

---

## 7. Common Issues

### PostgreSQL connection refused
```
# Check if PostgreSQL is running
pg_ctl status

# Create the database if it doesn't exist
psql -U postgres -c "CREATE DATABASE sih_eta_db;"
```

### Flutter doctor errors
```bash
flutter doctor
# Follow the instructions for any missing components
```

### Python dependency conflicts
```bash
# Ensure you're using the virtual environment
which python    # Should point to venv/bin/python

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```
