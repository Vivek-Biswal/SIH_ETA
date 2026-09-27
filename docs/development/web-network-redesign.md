# Network workspace

The website shares the mobile app's historical API at `/api/v1/network/insights`.
`/network` opens historical station and interaction analysis. `/network/map`,
`/network/congestion` and `/live` open the same workspace in current train mode.
The old mock events, random counts and hardcoded congestion diagrams are no longer
used on these routes.

Historical search supports station codes and train numbers, empty/error states,
station drilldown and links to current train details. Records retain their actual
observation period; refresh time is separately identified. Scores are not probabilities.

Current train mode verifies train number, service date and data source, pins the
resolved journey date and polls while visible. ETA uses the existing passenger
contract and observed-delay baseline. The provider currently may return status
without coordinates; the map states this explicitly. This is individual train
tracking, not a network-wide occupancy or signal feed.

Simulation is a separate illustrative corridor model. Its clock advances only
while running; playback speed affects scenario time, movement and recovery.
Map lines connect approximate locations rather than surveyed rail geometry.
Mitigation is a model rule, not an actual dispatch optimization service.

## MapTiler

Set `MAPTILER_API_KEY` or `NEXT_PUBLIC_MAPTILER_API_KEY` in the railway Vercel
project for the intended deployment environment. `/api/maps/config` reads either
at runtime. The response intentionally exposes the browser key to MapTiler's
client tile layer; use a MapTiler browser key restricted to the website domains.
Do not put an administrative credential in this variable. Tiles use MapTiler's
256-pixel raster endpoint with MapTiler and OpenStreetMap attribution visible.
Missing configuration and failed tile requests show explicit errors and retry.

The connected Vercel account in this work session listed only `sport-assess`.
The railway project's environment values and tile authorization therefore remain
unverified until the correct project is accessible. No Vercel configuration was
changed and these changes have not been published.

## Branding and verification

The supplied artwork is retained in web `public/brand/logo.png` and mobile
`assets/brand/logo.png`. Run `node scripts/brand-assets.cjs` from the web project
to package platform icon sizes. No redesign of the supplied image is performed.

Validation includes the web production build, passenger/network contract tests,
Flutter analysis and onboarding tests. Browser checks exercised real NDLS
analysis, train 12423 status, simulation disruption/recovery and a phone viewport.
Actual map tile rendering still requires the project's configured key.
