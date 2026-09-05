"""
Mock Supabase client for local development without a real Supabase instance.
Mimics the chainable query-builder interface and returns hardcoded sample data.
"""

from datetime import datetime


MOCK_STATIONS = [
    {"code": "NDLS", "name": "New Delhi", "state": "Delhi", "zone": "NR", "latitude": 28.6414, "longitude": 77.2197, "platform_count": 16, "is_junction": True},
    {"code": "BCT", "name": "Mumbai Central", "state": "Maharashtra", "zone": "WR", "latitude": 18.9691, "longitude": 72.8191, "platform_count": 5, "is_junction": False},
    {"code": "MAS", "name": "Chennai Central", "state": "Tamil Nadu", "zone": "SR", "latitude": 13.0827, "longitude": 80.2755, "platform_count": 12, "is_junction": True},
    {"code": "HWH", "name": "Howrah Junction", "state": "West Bengal", "zone": "ER", "latitude": 22.5803, "longitude": 88.3467, "platform_count": 23, "is_junction": True},
    {"code": "BLR", "name": "Bengaluru City", "state": "Karnataka", "zone": "SWR", "latitude": 12.9788, "longitude": 77.572, "platform_count": 6, "is_junction": True},
    {"code": "JP", "name": "Jaipur Junction", "state": "Rajasthan", "zone": "NWR", "latitude": 26.922, "longitude": 75.787, "platform_count": 6, "is_junction": True},
    {"code": "AGC", "name": "Agra Cantt", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 27.1767, "longitude": 78.0081, "platform_count": 5, "is_junction": False},
    {"code": "PNBE", "name": "Patna Junction", "state": "Bihar", "zone": "ECR", "latitude": 25.6093, "longitude": 85.1376, "platform_count": 10, "is_junction": True},
    {"code": "LKO", "name": "Lucknow NR", "state": "Uttar Pradesh", "zone": "NR", "latitude": 26.856, "longitude": 80.9114, "platform_count": 6, "is_junction": False},
    {"code": "JHS", "name": "Jhansi Junction", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 25.4486, "longitude": 78.5696, "platform_count": 5, "is_junction": True},
    {"code": "BPL", "name": "Bhopal Junction", "state": "Madhya Pradesh", "zone": "WCR", "latitude": 23.2599, "longitude": 77.4126, "platform_count": 6, "is_junction": True},
    {"code": "NGP", "name": "Nagpur Junction", "state": "Maharashtra", "zone": "CR", "latitude": 21.1458, "longitude": 79.0882, "platform_count": 5, "is_junction": True},
]

MOCK_TRAINS = [
    {"train_number": "12301", "train_name": "Howrah Rajdhani Express", "from_station": "HWH", "to_station": "NDLS", "departure_time": "16:55", "arrival_time": "10:00", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Rajdhani"},
    {"train_number": "12951", "train_name": "Mumbai Rajdhani Express", "from_station": "BCT", "to_station": "NDLS", "departure_time": "17:00", "arrival_time": "08:35", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Rajdhani"},
    {"train_number": "12621", "train_name": "Tamil Nadu Express", "from_station": "NDLS", "to_station": "MAS", "departure_time": "22:30", "arrival_time": "05:45", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Superfast"},
    {"train_number": "12302", "train_name": "New Delhi Rajdhani Express", "from_station": "NDLS", "to_station": "HWH", "departure_time": "17:15", "arrival_time": "10:05", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Rajdhani"},
    {"train_number": "12952", "train_name": "New Delhi Rajdhani Express", "from_station": "NDLS", "to_station": "BCT", "departure_time": "16:25", "arrival_time": "08:15", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Rajdhani"},
    {"train_number": "12002", "train_name": "Bhopal Shatabdi Express", "from_station": "NDLS", "to_station": "BPL", "departure_time": "06:00", "arrival_time": "13:50", "days_of_run": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], "train_type": "Shatabdi"},
]

MOCK_SCHEDULES = {
    "12301": [
        {"station_code": "HWH", "station": {"code": "HWH", "name": "Howrah Junction"}, "stop_sequence": 1, "scheduled_arrival": None, "scheduled_departure": "16:55"},
        {"station_code": "DGR", "station": {"code": "DGR", "name": "Durgapur"}, "stop_sequence": 2, "scheduled_arrival": "18:43", "scheduled_departure": "18:45"},
        {"station_code": "PNBE", "station": {"code": "PNBE", "name": "Patna Junction"}, "stop_sequence": 3, "scheduled_arrival": "21:25", "scheduled_departure": "21:35"},
        {"station_code": "MGS", "station": {"code": "MGS", "name": "Mughal Sarai"}, "stop_sequence": 4, "scheduled_arrival": "23:50", "scheduled_departure": "23:55"},
        {"station_code": "JHS", "station": {"code": "JHS", "name": "Jhansi Junction"}, "stop_sequence": 5, "scheduled_arrival": "05:20", "scheduled_departure": "05:25"},
        {"station_code": "AGC", "station": {"code": "AGC", "name": "Agra Cantt"}, "stop_sequence": 6, "scheduled_arrival": "07:10", "scheduled_departure": "07:12"},
        {"station_code": "NDLS", "station": {"code": "NDLS", "name": "New Delhi"}, "stop_sequence": 7, "scheduled_arrival": "10:00", "scheduled_departure": None},
    ],
    "12951": [
        {"station_code": "BCT", "station": {"code": "BCT", "name": "Mumbai Central"}, "stop_sequence": 1, "scheduled_arrival": None, "scheduled_departure": "17:00"},
        {"station_code": "VS", "station": {"code": "VS", "name": "Vadodara Junction"}, "stop_sequence": 2, "scheduled_arrival": "21:10", "scheduled_departure": "21:15"},
        {"station_code": "RTM", "station": {"code": "RTM", "name": "Ratlam Junction"}, "stop_sequence": 3, "scheduled_arrival": "00:40", "scheduled_departure": "00:45"},
        {"station_code": "AGC", "station": {"code": "AGC", "name": "Agra Cantt"}, "stop_sequence": 4, "scheduled_arrival": "06:50", "scheduled_departure": "06:52"},
        {"station_code": "NDLS", "station": {"code": "NDLS", "name": "New Delhi"}, "stop_sequence": 5, "scheduled_arrival": "08:35", "scheduled_departure": None},
    ],
    "12621": [
        {"station_code": "NDLS", "station": {"code": "NDLS", "name": "New Delhi"}, "stop_sequence": 1, "scheduled_arrival": None, "scheduled_departure": "22:30"},
        {"station_code": "JHS", "station": {"code": "JHS", "name": "Jhansi Junction"}, "stop_sequence": 2, "scheduled_arrival": "02:15", "scheduled_departure": "02:20"},
        {"station_code": "BPL", "station": {"code": "BPL", "name": "Bhopal Junction"}, "stop_sequence": 3, "scheduled_arrival": "06:00", "scheduled_departure": "06:05"},
        {"station_code": "NGP", "station": {"code": "NGP", "name": "Nagpur Junction"}, "stop_sequence": 4, "scheduled_arrival": "10:30", "scheduled_departure": "10:35"},
        {"station_code": "MAS", "station": {"code": "MAS", "name": "Chennai Central"}, "stop_sequence": 5, "scheduled_arrival": "05:45", "scheduled_departure": None},
    ],
}

TODAY = datetime.now().strftime("%Y-%m-%d")

MOCK_JOURNEYS = [
    {"id": "journey-001", "train_number": "12301", "start_date": TODAY, "status": "running", "train_states": {"delay_minutes": 15, "status": "running", "current_station_code": "PNBE", "updated_at": datetime.utcnow().isoformat() + "Z"}},
    {"id": "journey-002", "train_number": "12951", "start_date": TODAY, "status": "running", "train_states": {"delay_minutes": 0, "status": "running", "current_station_code": "RTM", "updated_at": datetime.utcnow().isoformat() + "Z"}},
    {"id": "journey-003", "train_number": "12621", "start_date": TODAY, "status": "running", "train_states": {"delay_minutes": 25, "status": "running", "current_station_code": "BPL", "updated_at": datetime.utcnow().isoformat() + "Z"}},
]

MOCK_OBSERVATIONS = {
    "journey-001": [
        {"station_code": "HWH", "act_dep": "16:55", "act_arr": None, "arr_delay": 0, "dep_delay": 0},
        {"station_code": "DGR", "act_arr": "18:50", "act_dep": "18:52", "arr_delay": 7, "dep_delay": 7},
        {"station_code": "PNBE", "act_arr": "21:40", "act_dep": None, "arr_delay": 15, "dep_delay": 0},
    ],
    "journey-002": [
        {"station_code": "BCT", "act_dep": "17:00", "act_arr": None, "arr_delay": 0, "dep_delay": 0},
        {"station_code": "VS", "act_arr": "21:10", "act_dep": "21:15", "arr_delay": 0, "dep_delay": 0},
    ],
    "journey-003": [
        {"station_code": "NDLS", "act_dep": "22:55", "act_arr": None, "arr_delay": 0, "dep_delay": 25},
        {"station_code": "JHS", "act_arr": "02:50", "act_dep": "02:55", "arr_delay": 35, "dep_delay": 35},
        {"station_code": "BPL", "act_arr": "06:35", "act_dep": None, "arr_delay": 30, "dep_delay": 0},
    ],
}

MOCK_BOTTLENECKS = [
    {"station_code": "MGS", "risk_score": 0.92, "active_train_count": 12, "station": {"code": "MGS", "name": "Mughal Sarai"}},
    {"station_code": "JHS", "risk_score": 0.78, "active_train_count": 8, "station": {"code": "JHS", "name": "Jhansi Junction"}},
    {"station_code": "AGC", "risk_score": 0.65, "active_train_count": 6, "station": {"code": "AGC", "name": "Agra Cantt"}},
]

MOCK_DELAY_DNA = [
    {"factor": "weather", "contribution_minutes": 10, "is_recovery": False},
    {"factor": "track_maintenance", "contribution_minutes": 8, "is_recovery": False},
    {"factor": "signal_delay", "contribution_minutes": 5, "is_recovery": False},
    {"factor": "driver_speed_adjustment", "contribution_minutes": -8, "is_recovery": True},
]


class MockQueryResult:
    def __init__(self, data=None, count=None):
        self.data = data if data is not None else []
        self.count = count


class MockQuery:
    def __init__(self, table_name, data):
        self._table_name = table_name
        self._data = list(data)
        self._filters = []
        self._select_fields = None
        self._order_field = None
        self._order_desc = False
        self._limit_val = None
        self._range_start = None
        self._range_end = None
        self._count = None

    def select(self, fields="*", count=None):
        self._select_fields = fields
        if count == "exact":
            self._count = len(self._data)
        return self

    def eq(self, field, value):
        self._filters.append(("eq", field, value))
        return self

    def ilike(self, field, pattern):
        self._filters.append(("ilike", field, pattern))
        return self

    def gte(self, field, value):
        self._filters.append(("gte", field, value))
        return self

    def is_(self, field, value):
        if value == "null":
            self._filters.append(("is_null", field))
        return self

    def order(self, field, desc=False):
        self._order_field = field
        self._order_desc = desc
        return self

    def limit(self, n):
        self._limit_val = n
        return self

    def range(self, start, end):
        self._range_start = start
        self._range_end = end
        return self

    def execute(self):
        result = list(self._data)

        for filt in self._filters:
            op, field, value = filt
            if op == "eq":
                result = [r for r in result if r.get(field) == value]
            elif op == "ilike":
                pattern = value.replace("%", "").lower()
                result = [r for r in result if pattern in str(r.get(field, "")).lower()]
            elif op == "gte":
                result = [r for r in result if r.get(field, 0) >= value]
            elif op == "is_null":
                result = [r for r in result if r.get(field) is None]

        count = len(result)

        if self._order_field:
            result.sort(key=lambda r: r.get(self._order_field) or "", reverse=self._order_desc)

        if self._range_start is not None and self._range_end is not None:
            result = result[self._range_start:self._range_end + 1]
        elif self._limit_val is not None:
            result = result[:self._limit_val]

        return MockQueryResult(data=result, count=count)


class MockTable:
    def __init__(self, name, data):
        self._name = name
        self._data = data

    def select(self, fields="*", count=None):
        return MockQuery(self._name, self._data).select(fields, count)


class MockSupabaseClient:
    def __init__(self):
        self._tables = {
            "stations": MOCK_STATIONS,
            "trains": MOCK_TRAINS,
            "schedules": _flatten_schedules(),
            "train_journeys": MOCK_JOURNEYS,
            "train_states": _flatten_train_states(),
            "station_observations": _flatten_observations(),
            "network_bottlenecks": MOCK_BOTTLENECKS,
            "eta_predictions": [],
            "delay_dna": _flatten_delay_dna(),
        }

    def table(self, name):
        data = self._tables.get(name, [])
        return MockTable(name, data)


def _flatten_schedules():
    rows = []
    for train_num, stops in MOCK_SCHEDULES.items():
        for stop in stops:
            row = dict(stop)
            row["train_number"] = train_num
            rows.append(row)
    return rows


def _flatten_train_states():
    rows = []
    for j in MOCK_JOURNEYS:
        state = dict(j.get("train_states", {}))
        state["journey_id"] = j["id"]
        state["train_number"] = j["train_number"]
        state["status"] = j["status"]
        rows.append(state)
    return rows


def _flatten_observations():
    rows = []
    for jid, obs_list in MOCK_OBSERVATIONS.items():
        for obs in obs_list:
            row = dict(obs)
            row["journey_id"] = jid
            rows.append(row)
    return rows


def _flatten_delay_dna():
    rows = []
    for j in MOCK_JOURNEYS:
        for d in MOCK_DELAY_DNA:
            row = dict(d)
            row["journey_id"] = j["id"]
            rows.append(row)
    return rows
