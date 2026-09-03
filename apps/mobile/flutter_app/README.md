# Mobile App — SIH ETA

Flutter-based mobile application for the SIH ETA project. This is the commuter-facing client.

## Structure

```
apps/mobile/flutter_app/
├── lib/
│   ├── core/              ← Core infrastructure
│   │   ├── config/        ← App configuration, environment vars
│   │   ├── constants/     ← App-wide constants (colors, text styles)
│   │   ├── theme/         ← App themes (light/dark)
│   │   ├── routing/       ← go_router configuration
│   │   ├── network/       ← HTTP clients (Dio), interceptors
│   │   ├── storage/       ← Local storage (SharedPreferences / Secure Storage)
│   │   └── utils/         ← Helper functions, extensions
│   │
│   ├── features/          ← Feature-based modules (Clean Architecture)
│   │   ├── authentication/
│   │   ├── home/
│   │   ├── train_search/
│   │   ├── train_status/
│   │   ├── eta/
│   │   ├── train_details/
│   │   ├── notifications/
│   │   └── profile/
│   │
│   ├── shared/            ← Shared across features
│   │   ├── widgets/       ← Reusable UI components
│   │   ├── models/        ← Cross-feature data models
│   │   └── components/    ← Complex shared components
│   │
│   └── main.dart          ← App entrypoint
│
├── test/                  ← Unit and widget tests
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── pubspec.yaml           ← Dependencies
└── README.md              ← This file
```

## Setup

```bash
flutter pub get
```

## Environment Configuration

Create `.env` (or use `dart-define` in your run config):

```
FLUTTER_API_BASE_URL=http://localhost:8000/api/v1
FLUTTER_WS_URL=ws://localhost:8000/ws
```

## Running the App

```bash
flutter run
```

## Architecture Notes

- **Clean Architecture within Features**: Each feature inside `lib/features/` should have `presentation`, `domain`, and `data` layers.
- **State Management**: We use Riverpod (`flutter_riverpod`).
- **Routing**: We use `go_router` for declarative routing.
- **Networking**: All API calls must go through the network client in `lib/core/network/`, which handles authentication and base URLs. Do NOT hardcode URLs in UI code.
