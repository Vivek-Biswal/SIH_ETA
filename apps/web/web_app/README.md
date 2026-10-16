# Etaernal website

Next.js 16 / React 19 passenger interface: train lookup, station-level ETA,
route visualization, journey analytics, historical delay patterns and a clearly
separated what-if simulation. Styling uses Tailwind CSS 4 and component CSS
modules; maps use Leaflet.

```bash
npm ci
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 for a local API.
npm run dev
```

The example defaults to the shared hosted backend. Use your own backend to avoid
spending the public demo's limited provider allowance during development.
`MAPTILER_API_KEY` is a domain-restricted browser key, not a private provider key.
Missing/rejected map configuration triggers an identified OpenStreetMap fallback.

| Route | Purpose |
| --- | --- |
| `/dashboard` | Passenger search and dated historical summary |
| `/trains`, `/trains/[id]`, `/trains/[id]/eta` | Route search, status and selected-station arrival |
| `/network`, `/network/map` | Journey insights / selected-train geographic view |
| `/analytics` | Confirmed-arrival analytics for one selected journey |
| `/journey-insights` | Compact shared workspace used by the mobile WebView |
| `/stations`, `/settings` | Station tools and local preferences |

```bash
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
npm start
```

The older `npm run lint` script still uses `next lint`, which is not the current
Next.js lint workflow. For direct inspection use `npx eslint .`; existing lint
debt is separate from the focused tests/build. No `npm test` or `type-check`
package script is currently defined.

[Project overview](../../../README.md) · [Setup](../../../docs/development/setup.md) ·
[Feature boundaries](../../../docs/FEATURE_STATUS.md) · [API](../../../docs/api/api-contract.md)
