"""Importer integrity checks using deliberately small fixture records."""
import csv
import io
import unittest

from intelligence.train_eta.data.import_public_history import REQUIRED, normalize_csv


def fixture(**changes):
    row = dict.fromkeys(REQUIRED, "")
    row.update({
        "date": "2026-08-01", "train_no": "12423", "station_code": "ABC", "seq": "2",
        "reported": "1", "reported_at": "2026-08-01T21:10:30+05:30", "departed": "1",
        "sch_arrival": "21:00", "sch_arrival_date": "01 Aug 2026",
        "act_arrival": "21:10", "act_arrival_date": "01 Aug 2026",
        "sch_departure": "21:05", "sch_departure_date": "01 Aug 2026",
        "act_departure": "21:15", "act_departure_date": "01 Aug 2026",
        "distance_km": "123.4", "train_type": "RAJ",
    })
    row.update(changes)
    return row


def imported(*rows):
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=sorted(REQUIRED))
    writer.writeheader()
    writer.writerows(rows)
    return normalize_csv(stream.getvalue().encode(), "12423")


class PublicHistoryImportTests(unittest.TestCase):
    def test_schedule_only_and_future_actual_values_are_not_labels(self):
        events, audit = imported(fixture(reported="0"), fixture(act_arrival="21:20"))
        self.assertEqual(events, [])
        self.assertEqual(audit["counts"]["unreported"], 1)
        self.assertEqual(audit["counts"]["missing_or_unconfirmed_arrival"], 1)

    def test_later_departure_keeps_separate_evidence_time(self):
        events, _ = imported(fixture())
        self.assertTrue(events[0]["arrival_confirmed"])
        self.assertTrue(events[0]["departure_confirmed"])
        self.assertGreater(events[0]["actual_departure"], events[0]["reported_at"])

    def test_invalid_departure_does_not_confirm_train_left(self):
        events, _ = imported(fixture(act_departure="20:50"))
        self.assertFalse(events[0]["departure_confirmed"])
        self.assertIsNone(events[0]["actual_departure"])

    def test_conflicting_actual_times_exclude_entire_event(self):
        events, audit = imported(fixture(), fixture(act_arrival="21:09"))
        self.assertEqual(events, [])
        self.assertEqual(audit["counts"]["conflicting_event_keys"], 1)

    def test_compatible_duplicates_combine_and_revisits_remain(self):
        events, audit = imported(fixture(act_departure="", act_departure_date=""), fixture(), fixture(seq="5"))
        self.assertEqual(len(events), 2)
        self.assertTrue(events[0]["departure_confirmed"])
        self.assertEqual(audit["counts"]["duplicate_rows"], 1)

    def test_multiday_stop_uses_explicit_calendar_date(self):
        events, _ = imported(fixture(sch_arrival="00:05", sch_arrival_date="02 Aug 2026",
                                    act_arrival="00:10", act_arrival_date="02 Aug 2026",
                                    reported_at="2026-08-02T00:10:30+05:30", departed="0"))
        self.assertEqual(events[0]["journey_date"], "2026-08-01")
        self.assertEqual(events[0]["actual_arrival"], "2026-08-02T00:10:00+05:30")


if __name__ == "__main__":
    unittest.main()
