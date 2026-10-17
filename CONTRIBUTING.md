# Contributing to Etaernal

Thank you for helping make railway arrival information more useful and honest.
Start with [local setup](docs/development/setup.md), [feature status](docs/FEATURE_STATUS.md)
and [the ETA audit](docs/ETA_MODEL_AUDIT.md). The repository has no selected software
licence yet; discuss substantial external reuse or third-party imports with the
maintainer before proceeding.

## Before changing code

1. Search existing issues. For a large feature, describe the user problem and
   proposed scope in an issue first.
2. Create a focused branch from the current default branch, `main`:
   `git switch -c feature/short-description` (another descriptive prefix is fine).
3. Keep application behavior, API contracts and deployment paths stable unless
   the change explicitly needs to alter them.
4. Use the actual source and runtime OpenAPI as evidence. Older design documents
   and illustrative simulation data must not become live operational claims.

These are contribution recommendations, not a claim that branch protection,
required reviewer counts or a `develop` integration policy are configured.

## Checks by area

Run from the indicated directory. Install development test tools as shown in
the [setup guide](docs/development/setup.md#verification).

| Change | Checks |
| --- | --- |
| Backend | `cd backend`; `python -m pytest tests/ -q` |
| Website | `cd apps/web/web_app`; `npx tsc --noEmit`; `node --test tests/*.test.mjs`; `npm run build` |
| Flutter | `cd apps/mobile/flutter_app`; `flutter analyze`; `flutter test` |
| ETA import/training contract | From root: `python -m pytest intelligence/tests/test_public_history_import.py intelligence/tests/test_eta_training_contract.py -q` |
| Documentation | From root: `python scripts/check_docs.py` |

Use a browser/emulator for relevant UI changes: desktop and narrow layouts,
keyboard focus, loading/error states and the full selected-train workflow.
Passing isolated tests does not prove that a public deployment has updated.

## ETA and data standards

- Identify a journey by train number **and origin date**, and a stop by route
  occurrence/sequence, not just station code.
- Keep actual arrivals, reported delay, predicted arrivals and timetable times
  distinct. Do not convert missing values into zero-delay observations.
- Preserve per-stop `prediction_method`, source and freshness. A top-level model
  result does not mean every stop used the model.
- Never infer signal failures, congestion or weather causation from lateness
  alone. Label estimated future recovery separately from recovered minutes.
- Train/evaluate on independent dated journeys. Prevent future actual times
  from entering as-of features; compare the same labels against the baseline.
- Record dataset provenance and licences. Keep large downloads, secrets,
  SQLite caches and generated build files outside Git.
- Maintain both web and mobile response adapters when API fields change.

## Pull requests and reports

Explain the concrete problem, resulting behavior, validation and limitations.
Use the pull-request template. Add genuine before/after screenshots for visual
changes, sanitized example responses for API changes and evaluation evidence
for prediction changes. State whether data was live, cached or a test fixture.

For a train-data issue include: train number, origin date, selected station,
time observed in IST, expected/actual behavior and a redacted screenshot.
Do not paste provider keys, tokens, passenger details or `.env` files. Follow
[the security policy](SECURITY.md) for sensitive problems.
