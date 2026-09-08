# Delay-DNA Definition

## What is Delay-DNA?

In the context of the SIH Indian Train ETA Project, **Delay-DNA** represents an **Analytical Delay Context and Pattern Profile**. It is a structured descriptive profile of a train's delay-related characteristics at a specific point in time or over a historical aggregation.

### What Delay-DNA IS:
- A profile combining a snapshot of current observed delays with historically aggregated contexts.
- An analytical tool to classify and understand structural delays along specific routes or stations.
- A descriptive categorization method to understand the "nature" of a train's typical performance (e.g., highly punctual, consistently late, prone to severe random disruptions).

### What Delay-DNA IS NOT:
- **NOT** a causal explanation for why a delay happened.
- **NOT** a supervised ML feature set for predicting future delay.
- **NOT** proof of what future delays will definitively be.
- **NOT** an individual time-series trajectory of historical performance.

---

## Delay-DNA Categories

### A. Current Observed Delay
- **Meaning**: The exact delay captured at the moment of the data snapshot.
- **Example**: A live reading showing `delay_minutes = 45`.
- **Level**: `OBSERVED_CURRENT`

### B. Historical Aggregated Delay Context
- **Meaning**: Averaged historical statistics representing general geographical or train-level trends.
- **Example**: A station's historical average delay is 15 minutes.
- **Level**: `HISTORICAL_AGGREGATED`

### C. Route / Schedule Context
- **Meaning**: Structural attributes of the journey that may correlate with delay patterns.
- **Example**: A train with 40 stops over a 2000 km route spanning 3 days.
- **Level**: `STATIC_CONTEXT`

### D. Station Context
- **Meaning**: Characteristics of the stations along the route.
- **Example**: The destination station is in a heavily congested railway zone.
- **Level**: `STATIC_CONTEXT`

---

> [!WARNING]
> Because we do not possess complete historical time-aligned sequences of individual train movements, Delay-DNA cannot currently measure individual train "recovery". It represents static patterns and single-snapshot observations.
