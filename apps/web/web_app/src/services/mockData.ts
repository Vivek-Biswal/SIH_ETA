import { ETAResponse, TrainStatus, NetworkZoneStatus, RouteCongestionSegment } from '../types/api';

export const mockEtaResponse12301: ETAResponse = {
  train_number: "12301",
  train_name: "Howrah Rajdhani Express",
  date: "2026-09-05",
  prediction_generated_at: "2026-09-05T14:30:00Z",
  model_version: "eta-xgboost-v1.2",
  overall_delay_minutes: 52,
  confidence_score: 0.78,
  remaining_stations: [
    {
      station: { code: "CNB", name: "Kanpur Central" },
      scheduled_arrival: "11:40",
      predicted_arrival: "12:02",
      predicted_delay_minutes: 22,
      prediction_confidence: 0.91,
      platform: "1"
    },
    {
      station: { code: "ALD", name: "Prayagraj Junction" },
      scheduled_arrival: "13:05",
      predicted_arrival: "13:24",
      predicted_delay_minutes: 19,
      prediction_confidence: 0.88,
      platform: "4"
    },
    {
      station: { code: "PBH", name: "Pratapgarh Junction" },
      scheduled_arrival: "14:20",
      predicted_arrival: "14:40",
      predicted_delay_minutes: 20,
      prediction_confidence: 0.85,
      platform: "2"
    },
    {
      station: { code: "BSB", name: "Varanasi Junction" },
      scheduled_arrival: "16:00",
      predicted_arrival: "16:24",
      predicted_delay_minutes: 24,
      prediction_confidence: 0.82,
      platform: "1"
    },
    {
      station: { code: "NDLS", name: "New Delhi" },
      scheduled_arrival: "19:55",
      predicted_arrival: "20:47",
      predicted_delay_minutes: 52,
      prediction_confidence: 0.78,
      platform: "12"
    }
  ],
  delay_factors: [
    {
      factor: "network_congestion",
      contribution_minutes: 38,
      description: "Severe block congestion on NDLS-CNB electrified quadruple track"
    },
    {
      factor: "historical_delay",
      contribution_minutes: 14,
      description: "Average turnaround delay observed on Thursday monsoon operations"
    }
  ]
};

export const mockTrainsList: TrainStatus[] = [
  {
    train_number: "12301",
    train_name: "Howrah Rajdhani Express",
    current_station: { code: "CNB", name: "Kanpur Central" },
    next_station: { code: "ALD", name: "Prayagraj Junction" },
    delay_minutes: 52,
    predicted_next_arrival: "13:24",
    scheduled_departure: "11:45",
    status: 'CRITICAL',
    zone: 'NR',
    speed_kmh: 115
  },
  {
    train_number: "12259",
    train_name: "Sealdah Duronto Express",
    current_station: { code: "DDU", name: "Pt. Deen Dayal Upadhyaya" },
    next_station: { code: "CNB", name: "Kanpur Central" },
    delay_minutes: 0,
    predicted_next_arrival: "14:10",
    scheduled_departure: "11:15",
    status: 'ON_TIME',
    zone: 'ER',
    speed_kmh: 128
  },
  {
    train_number: "22221",
    train_name: "CSMT Rajdhani Express",
    current_station: { code: "BPL", name: "Bhopal Junction" },
    next_station: { code: "JHS", name: "Virangana Lakshmibai" },
    delay_minutes: 23,
    predicted_next_arrival: "15:45",
    scheduled_departure: "12:30",
    status: 'DELAYED',
    zone: 'CR',
    speed_kmh: 102
  },
  {
    train_number: "12004",
    train_name: "Lucknow Swarna Shatabdi",
    current_station: { code: "GZB", name: "Ghaziabad Junction" },
    next_station: { code: "ALJN", name: "Aligarh Junction" },
    delay_minutes: 6,
    predicted_next_arrival: "07:35",
    scheduled_departure: "06:10",
    status: 'DELAYED',
    zone: 'NR',
    speed_kmh: 110
  }
];

export const mockNetworkZones: NetworkZoneStatus[] = [
  {
    zone_code: "NR",
    zone_name: "Northern Railway",
    active_trains: 312,
    delayed_trains: 114,
    critical_conflicts: 3,
    avg_delay_minutes: 24,
    status: 'DISRUPTED'
  },
  {
    zone_code: "ER",
    zone_name: "Eastern Railway",
    active_trains: 198,
    delayed_trains: 42,
    critical_conflicts: 1,
    avg_delay_minutes: 12,
    status: 'CONGESTED'
  },
  {
    zone_code: "WR",
    zone_name: "Western Railway",
    active_trains: 245,
    delayed_trains: 18,
    critical_conflicts: 0,
    avg_delay_minutes: 4,
    status: 'HEALTHY'
  },
  {
    zone_code: "CR",
    zone_name: "Central Railway",
    active_trains: 260,
    delayed_trains: 68,
    critical_conflicts: 2,
    avg_delay_minutes: 19,
    status: 'CONGESTED'
  }
];

export const mockCongestionSegments: RouteCongestionSegment[] = [
  {
    segment_id: "NDLS-GZB",
    from_station: "New Delhi",
    to_station: "Ghaziabad",
    active_trains: 8,
    congestion_score: 88,
    status: 'CONFLICT'
  },
  {
    segment_id: "GZB-ALJN",
    from_station: "Ghaziabad",
    to_station: "Aligarh",
    active_trains: 6,
    congestion_score: 72,
    status: 'CONGESTED'
  },
  {
    segment_id: "ALJN-CNB",
    from_station: "Aligarh",
    to_station: "Kanpur Central",
    active_trains: 11,
    congestion_score: 84,
    status: 'CONFLICT'
  },
  {
    segment_id: "CNB-PRYJ",
    from_station: "Kanpur Central",
    to_station: "Prayagraj",
    active_trains: 4,
    congestion_score: 35,
    status: 'NORMAL'
  }
];

export const mockDelayDna = {
  train_id: "12301",
  contributors: [
    {
      factor: "network_congestion",
      contribution_minutes: 38,
      description: "Severe block congestion on NDLS-CNB electrified quadruple track"
    },
    {
      factor: "historical_delay",
      contribution_minutes: 14,
      description: "Average turnaround delay observed on Thursday monsoon operations"
    }
  ],
  data_state: "mock"
};

export const mockRecovery = {
  current_delay: 52,
  expected_recovery: 20,
  expected_remaining_delay: 32,
  confidence: 0.85,
  data_state: "mock"
};

export const mockPropagation = {
  source_train: "12301",
  affected_train: "12259",
  affected_station: "CNB",
  predicted_delay: 15,
  time_window: "2h",
  risk: "medium",
  confidence: 0.72,
  data_state: "mock"
};

export const mockBottlenecks = [
  {
    location: "NDLS",
    time_window: "2h",
    risk: "high",
    affected_trains: 8,
    reason: "Platform unavailability and crossing conflicts",
    confidence: 0.9,
    data_state: "mock"
  },
  {
    location: "CNB",
    time_window: "4h",
    risk: "medium",
    affected_trains: 3,
    reason: "Speed restriction on bridge approach",
    confidence: 0.75,
    data_state: "mock"
  }
];

export const mockScenario = {
  scenario_id: "sim_123",
  status: "completed",
  results: {
    impact: "minimal",
    estimated_resolution: "45 mins"
  }
};
