# Frontend Architecture — SIH ETA

## Overview

The project has two independent frontend clients that both connect to the same backend API:

| Client | Technology | Purpose |
|---|---|---|
| Mobile App | Flutter 3.x (Dart) | Commuter-facing app |
| Web Dashboard | Next.js 14 (TypeScript) | Operations/analytics dashboard |

---

## Mobile App Architecture (`apps/mobile/flutter_app/`)

### Clean Architecture Pattern

Each feature follows a three-layer structure:

```
feature/
├── presentation/     ← Screens, Widgets, ViewModels (Riverpod providers)
│                       NO API calls here
├── domain/           ← Entities, Use Cases, Repository interfaces
│                       Pure Dart, no Flutter/platform dependencies
└── data/             ← API clients, DTOs, Repository implementations
                        Implements domain interfaces
```

### State Management: Riverpod 2.x

- `AsyncNotifierProvider` for async state (API data)
- `NotifierProvider` for sync/local state
- `StreamProvider` for WebSocket streams (live train updates)

### HTTP & WebSocket

- HTTP: `dio` package with interceptors for JWT token injection
- WebSocket: `web_socket_channel`
- Base URL comes from `lib/core/config/app_config.dart` (never hardcoded)

### Navigation: `go_router`

Route definitions in `lib/core/routing/app_router.dart`

### Key Features

| Feature dir | Screens |
|---|---|
| `authentication/` | Login screen |
| `home/` | Home screen with quick search |
| `train_search/` | Search trains by source/destination |
| `train_status/` | Live running status |
| `eta/` | AI ETA predictions per station |
| `train_details/` | Full route and timetable |
| `notifications/` | Push notification settings |
| `profile/` | User account settings |

---

## Web App Architecture (`apps/web/web_app/`)

### Framework: Next.js 14 (App Router)

Uses the App Router (`src/app/`) for layout, routing, and server components.

### Structure

```
src/
├── app/                  ← Next.js App Router: pages, layouts, loading states
├── components/
│   ├── ui/               ← Low-level UI primitives (buttons, inputs, cards)
│   └── layout/           ← Header, Sidebar, PageLayout
├── features/
│   ├── dashboard/        ← Main overview dashboard
│   ├── train_search/     ← Train search UI
│   ├── train_status/     ← Live status display
│   ├── eta/              ← ETA prediction display
│   ├── network/          ← Interactive network map (Mapbox/Leaflet)
│   └── analytics/        ← Delay trends and statistics charts
├── services/             ← API client functions (fetch wrappers)
├── hooks/                ← Custom React hooks
├── types/                ← TypeScript interfaces matching API schemas
├── utils/                ← Formatting, date helpers
├── config/               ← Environment config (reads NEXT_PUBLIC_* vars)
└── styles/               ← Global CSS, design tokens
```

### State Management: Zustand 4.x

- Global stores for auth state, active train, network summary
- Local component state for UI-only state

### API Integration

- All API calls go through `src/services/` — never directly in components
- Types in `src/types/` should match `shared/api_contracts/api-contract.yaml` schemas
- WebSocket connection managed in `src/services/websocket.ts`

---

## Shared Design Principles

1. **No business logic in screens/components** — use services, use cases, hooks
2. **No hardcoded URLs** — all API URLs from environment config
3. **No direct database access** — always through backend API
4. **Consistent error handling** — handle loading, error, and empty states in UI
5. **Accessibility** — use semantic HTML (web) and accessibility labels (Flutter)
