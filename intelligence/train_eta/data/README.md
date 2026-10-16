# Public historical station events

`import_public_history.py` imports a bounded sample from
[yadavsaurabh/indian-railways-runs](https://huggingface.co/datasets/yadavsaurabh/indian-railways-runs)
at immutable commit `d131017ee61b65681a1908025b93813169e8fb8f`.
The publisher declares GPL-3.0 and describes independent collection from the
public WhereIsMyTrain status cache. This is third-party observed data, not an
official or independently verified Indian Railways dataset.

Run from the repository root:

```powershell
python intelligence/train_eta/data/import_public_history.py
```

The default three trains are 12423, 12303 and 12624 (approximately 14 MB total).
The importer keeps raw CSVs under ignored `data/raw/eta_public_history/`, writes
canonical event JSONL to ignored `data/processed/eta_stop_events.jsonl`, and
records source URLs, commit, SHA-256 hashes, date coverage and exclusions in
`intelligence/train_eta/reports/source_manifest.json`.

Only rows explicitly reported by the source with valid, dated actual arrivals
at or before their reporting timestamp are retained. Conflicting duplicate
actual or scheduled times exclude that event. Compatible duplicates combine
missing fields. Train number and origin journey date identify the service;
sequence and station identify each stop, including revisits.

An arrival report can contain a departure filled in later. Training must never
use that departure before its actual timestamp. The importer marks confirmed
departure evidence separately; it does not assert that it was known when the
arrival was reported. Dated timestamps, not clipped source delay fields, should
produce labels. No weather, congestion, signal-wait or continuous GPS features
are invented. Accuracy claims must be limited to independently held-out journeys
and the train, route and prediction-horizon coverage actually evaluated.
