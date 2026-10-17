# Etaernal documentation

Start with the [project overview](../README.md), then choose a guide below.
These guides describe the source audited on **17 October 2026**. A working
interface, a historical experiment and a production-validated capability are
different things; the documentation keeps those distinctions explicit.

| I want to… | Read |
| --- | --- |
| Run the website, API and Flutter app | [Local setup](development/setup.md) |
| Understand what works and what is still limited | [Feature status](FEATURE_STATUS.md) |
| Understand the trained ETA pilot | [ETA training, validation and serving audit](ETA_MODEL_AUDIT.md) |
| See how the components communicate | [Runtime architecture](architecture/system-architecture.md) |
| Integrate with the passenger API | [API guide](api/api-contract.md) |
| Configure hosted services or build an APK | [Deployment guide](v1_deployment_guide.md) |
| Check data provenance and reuse conditions | [Data sources](DATA_SOURCES.md) |
| Update genuine application screenshots | [Screenshot guide](screenshots/README.md) |
| Contribute a change | [Contribution guide](../CONTRIBUTING.md) |
| Report a credential or security problem | [Security policy](../SECURITY.md) |
| Finish the GitHub About panel | [Repository settings](REPOSITORY_SETTINGS.md) |
| Review this documentation overhaul | [Presentation audit](PRESENTATION_AUDIT.md) |
| Understand the native arrival/feedback update | [Mobile delivery note](MOBILE_ETA_FEEDBACK.md) |
| Use passenger journey alerts | [Alert behavior and evidence](JOURNEY_ALERTS.md) |

## Evidence, not just descriptions

- [Model evaluation](../backend/data/eta_ml/evaluation.json): measured errors,
  complete-journey splits and the model-with-fallback serving-policy audit.
- [Split membership](../backend/data/eta_ml/split_manifest.json): dated journeys
  assigned to fitting, validation, calibration and final test.
- [Source manifest](../intelligence/train_eta/reports/source_manifest.json):
  pinned source URLs, hashes, exclusions and imported coverage.
- [Training implementation](../intelligence/train_eta/training/train.py) and
  [runtime inference](../backend/services/eta_ml.py).
- [Backend tests](../backend/tests/), [web tests](../apps/web/web_app/tests/)
  and [Flutter tests](../apps/mobile/flutter_app/test/).

## Earlier design documents

The following files preserve useful design/research history, but are **not the
current deployment or API contract**:

- [Original API proposal](../shared/api_contracts/api-contract.yaml).
- [Original data-flow proposal](architecture/data-flow.md).
- [Database design](database/database-design.md).
- [Intelligence architecture proposal](intelligence/intelligence-architecture.md).
- [Frontend architecture proposal](frontend/frontend-architecture.md).
- [Earlier frontend/API mapping](frontend-api-mapping.md).

For actual endpoint schemas use the running API's `/openapi.json` or `/docs`.
The feature-status guide takes precedence over old planning documents.
