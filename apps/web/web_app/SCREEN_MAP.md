# Web Dashboard — Next.js Route & Component Mapping

Stitch Project: [labs.google.com/stitch/projects/13686356860913469551](https://labs.google.com/stitch/projects/13686356860913469551)

---

## Navigation Architecture

```
Layout: RootLayout
├── /login               → No sidebar (auth-only layout)
└── DashboardLayout      → Fixed left sidebar + top nav bar
    ├── /dashboard       → Main Dashboard
    ├── /trains          → Train Search
    ├── /trains/[id]     → Train Status Details
    ├── /trains/[id]/eta → ETA Analysis
    ├── /network         → Network Overview
    ├── /network/map     → Network Map
    ├── /network/congestion → Route Congestion View
    ├── /analytics       → Delay Analytics
    ├── /analytics/compare → Train Comparison
    ├── /live            → Live Activity Feed
    ├── /alerts          → Alerts
    └── /settings        → Settings
```

---

## Screen-to-Route Mapping

| # | Screen Name | Next.js Route | Page File | Notes |
|---|---|---|---|---|
| 01 | Login | `/login` | `app/login/page.tsx` | Auth layout, no sidebar |
| 02 | Main Dashboard | `/dashboard` | `app/dashboard/page.tsx` | Dashboard layout |
| 03 | Train Search | `/trains` | `app/trains/page.tsx` | Data table + filters |
| 04 | Train Status Details | `/trains/[id]` | `app/trains/[id]/page.tsx` | Dynamic route |
| 05 | ETA Analysis | `/trains/[id]/eta` | `app/trains/[id]/eta/page.tsx` | Nested dynamic route |
| 06 | Network Overview | `/network` | `app/network/page.tsx` | Zone status + mini-map |
| 07 | Network Map | `/network/map` | `app/network/map/page.tsx` | Full-bleed map layout |
| 08 | Route Congestion | `/network/congestion` | `app/network/congestion/page.tsx` | Chart + route diagram |
| 09 | Delay Analytics | `/analytics` | `app/analytics/page.tsx` | Charts + ranked table |
| 10 | Train Comparison | `/analytics/compare` | `app/analytics/compare/page.tsx` | Side-by-side compare |
| 11 | Live Activity Feed | `/live` | `app/live/page.tsx` | Real-time feed |
| 12 | Alerts | `/alerts` | `app/alerts/page.tsx` | Alert list + filters |
| 13 | Settings | `/settings` | `app/settings/page.tsx` | Settings nav + panels |

---

## Next.js App Directory Structure

```
apps/web/web_app/
├── app/
│   ├── layout.tsx                      # Root layout (fonts, providers)
│   ├── login/
│   │   └── page.tsx                    # Login (no sidebar)
│   ├── (dashboard)/                    # Route group with shared layout
│   │   ├── layout.tsx                  # Dashboard layout: sidebar + topnav
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Main Dashboard
│   │   ├── trains/
│   │   │   ├── page.tsx                # Train Search (table + filters)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Train Status Details
│   │   │       └── eta/
│   │   │           └── page.tsx        # ETA Analysis
│   │   ├── network/
│   │   │   ├── page.tsx                # Network Overview
│   │   │   ├── map/
│   │   │   │   └── page.tsx            # Network Map (full-bleed)
│   │   │   └── congestion/
│   │   │       └── page.tsx            # Route Congestion
│   │   ├── analytics/
│   │   │   ├── page.tsx                # Delay Analytics
│   │   │   └── compare/
│   │   │       └── page.tsx            # Train Comparison
│   │   ├── live/
│   │   │   └── page.tsx                # Live Activity Feed
│   │   ├── alerts/
│   │   │   └── page.tsx                # Alerts
│   │   └── settings/
│   │       └── page.tsx                # Settings
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 # Fixed left sidebar with nav
│   │   ├── TopBar.tsx                  # Global search + user avatar + LIVE badge
│   │   └── Breadcrumb.tsx              # Dynamic breadcrumb component
│   ├── data-display/
│   │   ├── KpiCard.tsx                 # Metric cards (Active Trains, Delayed %, etc.)
│   │   ├── DataTable.tsx               # Reusable table (Whisper Border rows, monospace)
│   │   ├── StatusBadge.tsx             # Live Green / Warning Amber / Critical Red pills
│   │   ├── EtaDisplay.tsx              # Scheduled (strikethrough) vs Predicted display
│   │   └── StationTimeline.tsx         # Vertical route track with node states
│   ├── charts/
│   │   ├── DelayTrendChart.tsx         # Line chart: avg delay over time
│   │   ├── CongestionBarChart.tsx      # Horizontal bars per route segment
│   │   └── TrainCompareChart.tsx       # Grouped bar chart for train comparison
│   ├── network/
│   │   ├── NetworkMapContainer.tsx     # Dark map area (Mapbox/placeholder)
│   │   └── RouteOverlay.tsx            # SVG route lines (normal/congested/conflict)
│   ├── alerts/
│   │   ├── AlertCard.tsx               # Individual alert with severity border
│   │   └── AlertFeed.tsx               # Real-time list of alert cards
│   └── shared/
│       ├── SkeletonLoader.tsx          # Shimmer skeleton for tables/cards
│       ├── ErrorState.tsx              # Offline / data error / empty state panels
│       └── LiveIndicator.tsx           # Pulsing dot + "LIVE" text
│
├── lib/
│   ├── api.ts                          # Typed API client (fetches from FastAPI backend)
│   ├── websocket.ts                    # WebSocket client for live feed
│   └── utils.ts                        # formatDelay(), formatETA(), etc.
│
├── styles/
│   └── globals.css                     # CSS variables from DESIGN.md tokens
│
└── public/
    └── fonts/                          # Self-hosted Geist + JetBrains Mono
```

---

## Design Token Mapping (Stitch → CSS Variables)

Defined in `styles/globals.css` as CSS custom properties:

```css
:root {
  --color-canvas-black: #09090B;
  --color-surface-zinc: #18181B;
  --color-whisper-border: rgba(255, 255, 255, 0.1);
  --color-pure-white: #FFFFFF;
  --color-muted-steel: #A1A1AA;
  --color-live-green: #22C55E;
  --color-warning-amber: #F59E0B;
  --color-critical-red: #EF4444;
  --color-brand-blue: #3B82F6;
  --font-sans: 'Geist', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## Key Implementation Notes

1. **`(dashboard)` route group** — Uses a single shared `layout.tsx` that wraps all dashboard pages in the sidebar + topbar shell. The network map page overrides with a full-bleed layout using `overflow: hidden`.
2. **`DataTable.tsx`** — Built as a generic, headless component accepting column definitions and row data. All numeric cells use `font-family: var(--font-mono)`.
3. **`NetworkMapContainer.tsx`** — Wraps a Mapbox GL or Leaflet map; until the backend provides data, renders a styled placeholder SVG grid. The overlay controls use `backdrop-filter: blur(8px)`.
4. **`[DEMO]` annotations** — All charts and analytics pages clearly annotate placeholder values with `[DEMO]` in the UI label and a small footer disclaimer.
5. **WebSocket** — `live/page.tsx` and the `TopBar.tsx` LIVE badge subscribe to `/ws/activity` from the backend. Connection state is managed globally with Zustand.
6. **Loading states** — Every `page.tsx` wraps its data-fetching component in a `<Suspense>` boundary. The fallback renders `<SkeletonLoader />` matching the page's grid layout.
7. **Error/Offline** — A root-level `error.tsx` catches unhandled errors. The `ErrorState` component is used inline for per-section failures (e.g., a chart that failed to load).
