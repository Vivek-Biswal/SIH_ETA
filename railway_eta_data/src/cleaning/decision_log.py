"""
decision_log.py
Manages the decision log: KEEP / MAP / EXCLUDE / INVESTIGATE.
Every problematic record must receive exactly one decision.
"""
import csv
import os
from dataclasses import dataclass, field
from typing import List, Optional


VALID_DECISIONS = {"KEEP", "MAP", "EXCLUDE", "INVESTIGATE"}

DECISION_LOG_COLUMNS = [
    "record_id",
    "source",
    "issue_type",
    "decision",
    "reason",
    "original_value",
    "corrected_value",
]


@dataclass
class DecisionEntry:
    record_id: str          # e.g. "schedules#302214" or "stations#FM"
    source: str             # dataset name
    issue_type: str         # e.g. "MISSING_VALUE", "DUPLICATE", "BAD_TIME"
    decision: str           # KEEP / MAP / EXCLUDE / INVESTIGATE
    reason: str             # human-readable explanation
    original_value: str = ""
    corrected_value: str = ""

    def __post_init__(self):
        if self.decision not in VALID_DECISIONS:
            raise ValueError(f"Invalid decision: {self.decision!r}")

    def to_dict(self):
        return {
            "record_id": self.record_id,
            "source": self.source,
            "issue_type": self.issue_type,
            "decision": self.decision,
            "reason": self.reason,
            "original_value": self.original_value,
            "corrected_value": self.corrected_value,
        }


class DecisionLog:
    """Accumulates DecisionEntry objects and writes them to CSV."""

    def __init__(self):
        self._entries: List[DecisionEntry] = []

    def add(
        self,
        record_id: str,
        source: str,
        issue_type: str,
        decision: str,
        reason: str,
        original_value: str = "",
        corrected_value: str = "",
    ):
        entry = DecisionEntry(
            record_id=str(record_id),
            source=source,
            issue_type=issue_type,
            decision=decision,
            reason=reason,
            original_value=str(original_value),
            corrected_value=str(corrected_value),
        )
        self._entries.append(entry)

    def save(self, output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=DECISION_LOG_COLUMNS)
            writer.writeheader()
            for e in self._entries:
                writer.writerow(e.to_dict())
        print(f"Decision log saved -> {output_path} ({len(self._entries)} entries)")

    def summary(self) -> dict:
        counts = {"KEEP": 0, "MAP": 0, "EXCLUDE": 0, "INVESTIGATE": 0}
        for e in self._entries:
            counts[e.decision] = counts.get(e.decision, 0) + 1
        return counts
