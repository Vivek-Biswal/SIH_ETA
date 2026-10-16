# Data sources and attribution

Data provenance matters as much as the interface. This project is an SIH
prototype, **not an official Indian Railways information service**.

| Source | Used for | Limits / credentials |
| --- | --- | --- |
| [RailRadar](https://railradar.in/developers) | Train lookup, timetable, reported status and station information through the backend adapter | Private server-side allocation required. Coverage, freshness and quotas depend on the provider. Do not redistribute credentials or assume official railway ground truth. |
| [OpenWeather](https://openweathermap.org/forecast5) | Forecast context near a selected station and arrival time | Server-side key. Three-hour forecast periods are not measurements of track conditions or a confirmed cause of delay. |
| [MapTiler](https://www.maptiler.com/cloud/) | Geographic basemap | Domain-restricted browser key; publicly delivered to map clients. Keep attribution. Invalid credentials cause a visible OpenStreetMap fallback. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Fallback basemap and geographic attribution | Preserve attribution and comply with the tile provider's usage policy; this is not a bulk/offline tile service. |
| [indian-railways-runs](https://huggingface.co/datasets/yadavsaurabh/indian-railways-runs) by **yadavsaurabh** | Offline historical station-event training for three pilot trains | Third-party reported observations; the publisher declares GPL-3.0. Not official or independently audited ground truth. |
| Repository network-analysis artifacts | Dated station/inter-train analysis shown in Journey insights | September 2024 historical analysis, separate from ETA training. Raw source CSVs referenced by earlier notebooks are not all included. Scores are not live traffic measurements. |

## Reproducible ETA import

The historical importer pins the dataset to revision
`d131017ee61b65681a1908025b93813169e8fb8f`. The publisher describes collection
from the public WhereIsMyTrain status cache. Only **12303, 12423 and 12624** were
imported, approximately 14 MB, rather than the complete collection.

The retained import contains **63,251 station events across 3,134 dated
journeys**. Training uses the eligible subset since January 2025; after split
boundary exclusions, 1,300 journeys enter the four training/evaluation partitions.
Do not confuse raw imported events, correlated training examples and independent
journeys.

- [Import instructions](../intelligence/train_eta/data/README.md).
- [Pinned source card](https://huggingface.co/datasets/yadavsaurabh/indian-railways-runs/blob/d131017ee61b65681a1908025b93813169e8fb8f/README.md).
- [Source manifest and SHA-256 hashes](../intelligence/train_eta/reports/source_manifest.json).
- [Training/evaluation methodology](ETA_ML_AUDIT.md).

Raw downloads and canonical JSONL are ignored by Git. Do not add an entire
downloaded dataset or third-party repository to a presentation commit.

## Reuse and licensing

**No project software licence has been selected in this repository.** The
dataset publisher's GPL-3.0 declaration does not choose a licence for Etaernal.
Public repository visibility is not a substitute for a software licence.

Preserve upstream attribution and licence notices. Before redistributing raw
datasets, model derivatives or provider responses, review the applicable source
licence and service terms. The project does not grant rights it does not own.

## What would improve the evidence

1. Durable, time-aligned RailRadar observation archives with confirmed future
   arrival outcomes and permission for the intended use.
2. Broader train, route, season and disruption coverage; independent prospective
   testing against the same delay-carry-forward baseline.
3. Reliable operational feeds before adding signal, occupancy or rake-delay
   explanations, and dated weather observations before weather ML experiments.
4. Explicit contributor/project licence decisions and reviewed data provenance
   for the older network-analysis artifacts.
