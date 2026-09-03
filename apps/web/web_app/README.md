# Web App — SIH ETA

Next.js-based web dashboard for the SIH ETA project. This provides operations views, analytics, and network visualization.

## Structure

```
apps/web/web_app/
├── src/
│   ├── app/               ← Next.js App Router (pages, layouts)
│   ├── components/        ← React components
│   │   ├── ui/            ← Low-level primitives (buttons, inputs)
│   │   └── layout/        ← App layouts (header, sidebar)
│   ├── features/          ← Feature-specific code
│   │   ├── dashboard/
│   │   ├── train_search/
│   │   ├── train_status/
│   │   ├── eta/
│   │   ├── network/       ← Interactive network map
│   │   └── analytics/     ← Delay charts
│   ├── services/          ← API client calls
│   ├── hooks/             ← Custom React hooks
│   ├── types/             ← TypeScript interfaces (mirroring API contracts)
│   ├── utils/             ← Helper functions
│   ├── config/            ← Environment configuration
│   └── styles/            ← Global CSS
├── public/                ← Static assets
├── tests/                 ← Unit and E2E tests
├── package.json           ← Dependencies
└── README.md              ← This file
```

## Setup

```bash
npm install
```

## Environment Configuration

Copy `.env.example` to `.env.local` and set the following:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
```

## Running the App

```bash
npm run dev
```
Starts development server on `http://localhost:3000`.

## Architecture Notes

- **App Router**: Uses Next.js 14+ App Router.
- **State Management**: Uses Zustand for global state.
- **API Calls**: All external API calls must be defined in `src/services/` and use the base URL from config.
- **Types**: Ensure types in `src/types/` align with the canonical `shared/api_contracts/api-contract.yaml`.
