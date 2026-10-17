# Etaernal intelligence and research

The current learned ETA implementation is a **three-train station-event pilot**.
Do not infer deployed capability from older folder names, notebooks or wrappers.

| Area | Current entry point |
| --- | --- |
| Historical import | [Pinned importer and provenance](train_eta/data/README.md) |
| Real model training | [training/train.py](train_eta/training/train.py) |
| Serving-policy evaluation | [training/audit_policy.py](train_eta/training/audit_policy.py) |
| Source hashes and coverage | [source_manifest.json](train_eta/reports/source_manifest.json) |
| Shipped artifact / measured results | [backend/data/eta_ml](../backend/data/eta_ml/) |
| Runtime eligibility and JSON inference | [backend/services/eta_ml.py](../backend/services/eta_ml.py) |
| Historical network research | `network_intelligence/`, `propagation/` and their dated artifacts |

Read the [ETA audit](../docs/ETA_MODEL_AUDIT.md) for features, chronological splits,
baseline comparison, measured errors and serving limits. The legacy
`train_eta/inference/predictor.py` interface is not the deployed passenger model;
it declines learned prediction without the necessary dated observation inputs.

The runtime API does not need these research dependencies. To reproduce training,
use the separate pinned `train_eta/training/requirements.txt` in a Python 3.12
environment and follow [setup](../docs/development/setup.md#optional-offline-training).
Use a temporary output directory before replacing a shipped model. No new
experiment or accuracy improvement is claimed by this documentation update.

The historical source is third-party, not official NTES ground truth. Raw and
canonical data remain ignored; preserve the publisher's attribution and declared
licence. See [data sources](../docs/DATA_SOURCES.md).
