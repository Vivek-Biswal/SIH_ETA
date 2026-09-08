"""
Delay Analyzer — Orchestrator
==============================
Combines all delay sub-modules into a single analysis pipeline.
"""
from typing import Dict, Any, List, Optional

from .contract import DelayDNAProfile, HistoricalStationContext
from .current_delay import parse_observations, compute_summary
from .historical_delay import parse_da323_records, compute_historical_summary, build_station_lookup
from .station_patterns import analyze_station_coverage, rank_stations_by_avg_delay, rank_stations_by_punctuality
from .route_patterns import analyze_route_delay_association, group_delay_by_train_type
from .recovery import check_recovery_feasibility


class DelayAnalyzer:
    def __init__(
        self,
        raw_delays: List[Dict[str, Any]],
        raw_da323: List[Dict[str, Any]],
        trains_lookup: Dict[str, Dict[str, Any]],
        journeys_lookup: Dict[str, List[Dict[str, Any]]]
    ):
        self.observations = parse_observations(raw_delays)
        self.da323_records = parse_da323_records(raw_da323)
        self.historical_lookup: Dict[str, HistoricalStationContext] = build_station_lookup(self.da323_records)
        self.trains_lookup = trains_lookup
        self.journeys_lookup = journeys_lookup

    def current_delay_summary(self) -> Dict[str, Any]:
        return compute_summary(self.observations)

    def historical_summary(self) -> Dict[str, Any]:
        return compute_historical_summary(self.da323_records)

    def station_coverage(self) -> Dict[str, Any]:
        all_station_codes = []
        for stops in self.journeys_lookup.values():
            for s in stops:
                sc = s.get("station", "")
                if sc:
                    all_station_codes.append(sc.upper())
        unique_codes = list(set(all_station_codes))
        return analyze_station_coverage(unique_codes, self.historical_lookup)

    def top_delayed_stations(self, top_n: int = 10) -> List[Dict[str, Any]]:
        return rank_stations_by_avg_delay(self.historical_lookup, top_n)

    def top_punctual_stations(self, top_n: int = 10) -> List[Dict[str, Any]]:
        return rank_stations_by_punctuality(self.historical_lookup, top_n)

    def route_delay_association(self) -> Dict[str, Any]:
        # Build joint records where both delay and distance are available
        obs_map = {o.train_number: o for o in self.observations if o.delay_minutes is not None}
        records = []
        for tn, obs in obs_map.items():
            train = self.trains_lookup.get(tn)
            if train:
                try:
                    dist = float(train.get("distance", 0))
                except (TypeError, ValueError):
                    dist = None
                records.append({
                    "current_delay_minutes": obs.delay_minutes,
                    "route_distance": dist,
                    "train_type": train.get("type_canonical") or train.get("type")
                })
        return analyze_route_delay_association(records)

    def delay_by_train_type(self) -> Dict[str, Any]:
        obs_map = {o.train_number: o for o in self.observations if o.delay_minutes is not None}
        records = []
        for tn, obs in obs_map.items():
            train = self.trains_lookup.get(tn)
            records.append({
                "current_delay_minutes": obs.delay_minutes,
                "train_type": train.get("type_canonical") or train.get("type") if train else None
            })
        return group_delay_by_train_type(records)

    def recovery_feasibility(self) -> Dict[str, Any]:
        # Count snapshots per train — currently only 1 per train
        counts = {o.train_number: 1 for o in self.observations}
        return check_recovery_feasibility(counts)

    def build_dna_profile(self, train_number: str) -> DelayDNAProfile:
        """
        Builds a Delay-DNA profile for a given train by combining all available contexts.
        """
        profile = DelayDNAProfile(train_number=train_number)

        # Current delay
        obs_match = next((o for o in self.observations if o.train_number == train_number), None)
        if obs_match and obs_match.delay_minutes is not None:
            profile.current_delay_minutes = obs_match.delay_minutes
            profile.snapshot_timestamp = obs_match.snapshot_timestamp
            profile.delay_category = obs_match.delay_category
            profile.current_delay_status = "OBSERVED_CURRENT"

        # Static train info
        train = self.trains_lookup.get(train_number)
        if train:
            try:
                profile.route_distance = float(train.get("distance", 0)) or None
            except (TypeError, ValueError):
                pass
            try:
                dh = float(train.get("duration_h", 0))
                dm = float(train.get("duration_m", 0))
                profile.scheduled_duration_hours = dh + dm / 60.0 or None
            except (TypeError, ValueError):
                pass
            profile.train_type = train.get("type_canonical") or train.get("type")
            profile.route_context_status = "STATIC_CONTEXT"

        # Stop count from journeys
        route = self.journeys_lookup.get(train_number)
        if route:
            profile.stop_count = len(route)

        # Historical context — from journey destination
        if route:
            dest = route[-1].get("station", "")
            hist = self.historical_lookup.get(dest.upper())
            if hist:
                profile.historical_avg_delay = hist.avg_delay_minutes
                profile.historical_pct_right_time = hist.percent_right_time
                profile.historical_pct_significant_delay = hist.percent_significant_delay
                profile.historical_context_status = "HISTORICAL_AGGREGATED"

        return profile
