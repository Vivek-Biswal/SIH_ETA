# Application screenshots

These are **genuine application captures**, not design mockups or test fixtures.
Captured on **17 October 2026** against the public website and the existing
Android release APK, version **1.1.9+11**. No provider responses were replaced,
no ML result was fabricated and no API keys or account dashboards were captured.

The captures predate the website navigation split. Current **Train Tracking**
and **Simulation** live at `/network/map`; **Past Delay Insights** remains at
`/network`. The original capture URLs below are retained as provenance. The
mobile shared workspace continues to expose all four tools.

## Website gallery

Chrome at 1440 CSS pixels wide, device scale 1.5. Most captures are 2160×1500;
the taller analytics/search-workspace captures use 2160×1650 where useful.
Some screens are scrolled to the feature rather than captured at page top.

| File | Screen / capture steps | Evidence boundary |
| --- | --- | --- |
| [dashboard.png](website/dashboard.png) | `/dashboard`, fresh browser profile | Network summary explicitly shows September 2024 history. |
| [train-search.png](website/train-search.png) | `/trains`, station-pair and number forms | Genuine initial search state. |
| [eta-prediction.png](website/eta-prediction.png) | `/trains/12423/eta`, selected upcoming station Zamania | Reported-delay fallback, **not an ML inference screenshot**. Early timing/recovery evidence and weather are separate. |
| [train-route.png](website/train-route.png) | `/network` → Track my train → 12423 → scroll to route | One selected route, reported-station marker, 371/391 points mapped at capture; approximate geometry and exact-position unavailability are visible. |
| [journey-analytics.png](website/journey-analytics.png) | `/analytics` → 12423 → Analyze journey | Comparable completed arrivals only; missing route observations excluded. |
| [historical-insights.png](website/historical-insights.png) | `/network` → Past delays → wait for loaded station rows | September 2024 analysis; no live traffic or causal inference claimed. |
| [simulation.png](website/simulation.png) | `/network` → Simulation → 12423 → Load route → add 15-minute section wait → Skip to next station | Timetable-based **simulation**, independent of the real train's position. |

The route and simulation images show the real **OpenStreetMap fallback** selected
by the deployed application. They do not claim that MapTiler authorization was
working at capture time. Tile attribution is retained.

## Android gallery

1080×2400 PNG captures from the installed `medium_phone` Android emulator,
running the existing release APK. No device frame or composite was added.
The status bar uses the emulator's device clock; railway timestamps in the
application are labelled IST.

| File | Screen / capture steps |
| --- | --- |
| [home.png](mobile/home.png) | Native Flutter home after skipping first-run onboarding |
| [onboarding.png](mobile/onboarding.png) | Genuine first-run guide, step 1 |
| [train-details.png](mobile/train-details.png) | Native train 12423, reported journey 2026-10-15; running-status and source timestamps |
| [eta-prediction.png](mobile/eta-prediction.png) | Same journey, scroll to New Delhi arrival, recovery availability and station weather |
| [journey-insights.png](mobile/journey-insights.png) | Insights navigation; shared HTTPS workspace rendered inside the Android WebView |

The captured native ETA is also an explicit fallback. A pilot train number alone
does not prove the selected arrival qualified for ML. Search-result screens are
not included: the captured flow used direct five-digit lookup into train details.
No invented “results” screen is substituted for that workflow.

## Updating the screenshots

1. Run the actual website/app revision to be documented. Use a clean browser or
   emulator profile without personal information. Choose one available train and
   keep its origin date consistent across screens.
2. Use the real configured API. Do not intercept routes with fixtures, alter
   values in developer tools or pass synthetic responses off as live data.
3. Wait for loading to finish and dismiss keyboards/dialogs. Capture only the
   application. Keep visible source/freshness labels and map attribution.
4. Website: use Chrome's screenshot capture at a consistent viewport. Android:
   `adb shell screencap -p /sdcard/etaernal.png`, then
   `adb pull /sdcard/etaernal.png docs/screenshots/mobile/<screen>.png`.
5. Review every image for credentials, personal data, unreadable text, clipped
   key content and duplicates. Keep an honest unavailable state if that is the
   actual state; never relabel it a successful prediction.
6. Replace the descriptive file, update this capture record and the manifest's
   source/date/version metadata, then refresh hashes/dimensions:

```bash
# From repository root:
python scripts/check_docs.py --refresh-screenshots
python scripts/check_docs.py
```

The [manifest](manifest.json) records paths, sources, dimensions and SHA-256
hashes. The checker catches missing images, changed image bytes, broken local
links and bad section fragments. Hash refresh does not assert that a screenshot
is genuine; human inspection and accurate provenance remain required.

Do not commit APKs, screenshots of `.env`/provider accounts, test failure goldens
or huge full-page captures. Keep source images legible at GitHub gallery sizes.
