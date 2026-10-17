# Mobile ETA and feedback update

The native train details screen uses `/api/v1/trains/{number}/status` and
`/eta`, pinning the provider-resolved journey date. No synthetic forecast or
delay cause is added. The first usable upcoming scheduled halt is selected
by default; choosing a station overrides this, and its route sequence keeps
repeated visits selected across refreshes. Arrival times remain in IST.

An ETA needs a fresh live observation, a supported station prediction and
running journey status. Timetables, cached/old updates and missing status
must not masquerade as a current forecast. The status-unavailable view now
uses the same evidence checks instead of displaying raw predicted fields.
The request timeout is 45 seconds to accommodate provider and cold-start
latency, with no automatic burst retries or additional provider polling.

## Passenger feedback

The card below the selected arrival supports accurate/inaccurate estimates
and missing ETA reports. Optional notes are limited to 500 characters; the
interface asks passengers not to include personal details. A report includes
the train, journey date, station/route sequence and the estimate/observation
snapshot when available. It makes no RailRadar or weather API requests.

The app writes the report to SharedPreferences before posting to
`POST /api/v1/passenger/eta-feedback`. A failed send remains visibly pending
with a retry action. A receipt must match the report identifier before the
app claims success. Retrying uses the same identifier, so a timeout after a
successful server write does not create duplicate reports. The device keeps
up to 50 reports, evicting sent reports first and never silently discarding
pending reports. Copies are removed if the user clears app data/uninstalls.

The server stores at most 10,000 reports and prunes records older than 90 days
on insertion. Reports are **unverified passenger feedback**, have no public
read endpoint, and are not used as model-training labels or confirmed disruption causes.

`ETA_FEEDBACK_PATH` defaults to `data/eta-feedback.sqlite3`. On Render's
ephemeral filesystem, server copies can disappear on deploy/restart. For
durable central collection, point this path at an existing persistent disk
or migrate the table to a managed database. No paid disk is provisioned by
this change. The app retains its local copy after server acknowledgement.

Install the newly built APK to receive native changes; updating the Render
backend alone cannot replace an installed application's Dart code.

## Verification for version 1.1.10+12

- Flutter analysis: no issues. All 109 mobile unit/widget tests passed.
- All 169 backend unit tests passed, including feedback validation,
  storage failures, conflicting identifiers and simultaneous duplicate retries.
- One Android integration test passed on emulator-5554. It used clearly
  labelled fixture arrival data and submitted feedback through the real local
  HTTP API, receiving a matching server receipt without provider API calls.
- The deployed Render endpoint appears in OpenAPI and rejects an empty report
  with HTTP 422. No synthetic report was inserted into the production database.
- The signed release APK built successfully and installed over version 1.1.9
  without uninstalling the existing app. Android reports version 1.1.10,
  versionCode 12. Flutter application architectures: ARM64 and x86_64.
- Artifact: `apps/mobile/flutter_app/build/app/outputs/flutter-apk/Etaernal-1.1.10.apk`.
  SHA-256: `4481db36ea0c4acf9738247c35a2a11198d83886d5275e0eb8687587b04b2f92`.

This verifies delivery and UI behavior, not forecast accuracy on future
journeys or availability of fresh RailRadar observations.
