# Passenger journey alerts

The website `/alerts` page now watches explicitly selected train journeys. It no
longer turns historical network bottlenecks into “Live” operational incidents or
claims normal network conditions when an API call fails.

## Passenger workflow

1. Enter a five-digit train number, optional **origin start date**, and a delay
   threshold (5, 15, 30 or 60 minutes). Up to three journeys can be watched.
2. Adding a journey checks its status and, only if that succeeds, its ETA. The
   provider-resolved origin date is pinned for later checks.
3. Choose a route stop from the loaded response. Stop/threshold changes make no
   additional provider requests. Repeated visits retain their route sequence.
4. Review current delay warnings, arrival-estimate changes, imminent arrivals
   and supported cancellation/skipped-stop reports. Open arrival details for the
   same dated journey and exact route occurrence.
5. Filter updates, mark them read, remove watches, or manually check again.

Watch settings and up to 200 read identifiers are stored in this browser.
Provider responses are not stored in localStorage. Reloading restores settings
but does not silently query trains or present old snapshots as current alerts.
Unavailable browser storage is explicitly identified; in-memory use still works.

## Evidence boundaries

- Current alert generation requires a matching train/date, `live` status source,
  a dated observation no older than five minutes and no failed latest check.
- ETA alerts additionally use the same `stationArrival` evidence/freshness rules
  as the passenger ETA interface. A fresh train report does not make a missing
  ETA available.
- Arrival changes require a newer running observation and a previous successful
  check for the same dated journey and route occurrence. Changes are not invented
  by comparing different stations or by refreshing the same report.
- Missing/old/failed reports produce an explicit waiting/error state. Absence of
  alerts is not a network-wide all-clear.
- Physical causes are not guessed from positive delay. Available station-specific
  explanation details remain expandable in the update card.
- Historical patterns remain at `/network` (Past Delay Insights), separate from
  current passenger alerts. Older compatibility/mock APIs are not used here.
- These are **in-page updates**, not SMS, browser push or a background notification
  service. No nationwide operational incident feed is connected.

## Request budget and lifecycle

Manual checks are the default. Adding a watch performs one check; reopening the
page does not automatically spend allocation. Each watch permits at most one
request sequence at a time and checks are spaced by at least two minutes.
The existing backend shares status/ETA provider responses and aliases their
resolved date. Alerts request no timetable search, network bottleneck or weather
feed merely to render the page.

Optional automatic checks follow the website's two-/five-minute setting, stop
when hidden and respect the global manual-only setting. Unsuccessful/stale or
partially failed checks back off for 4, 8 and then at most 15 minutes; unexpected
errors wait five minutes. The next allowed check time is shown. Removing a watch
or leaving the page aborts its in-flight request.

The `loadJourney` service's optional `requireStatusForETA` flag prevents a wasted
ETA request after status failure. Existing callers retain their previous behavior.

## Implementation and validation

- [Alert derivation and preference validation](../apps/web/web_app/src/services/journeyAlerts.ts).
- [Request lifecycle and storage hook](../apps/web/web_app/src/hooks/useJourneyAlerts.ts).
- [Passenger interface](../apps/web/web_app/src/components/alerts/JourneyAlerts.tsx).
- [Focused alert tests](../apps/web/web_app/tests/journeyAlerts.test.mjs).

Unit tests cover station/threshold selection, stale/cached/future/mismatched
reports, cancellations, arrival-change comparisons, ambiguous route occurrences,
preference validation and request suppression after status failure. Browser
workflow tests use explicitly labelled controlled responses rather than consuming
real train API allowance; those screenshots are test artifacts, not product-gallery
evidence. Production-provider freshness/availability still depends on the upstream
service. The local ESLint installation currently crashes before evaluating rules;
that toolchain issue is separate from TypeScript, test and build results.
