export interface Station {
  code: string;
  name: string;
}

export interface RemainingStation {
  station: Station;
  scheduled_arrival: string;
  predicted_arrival: string;
  predicted_delay_minutes: number;
  prediction_confidence: number;
  platform?: string;
}

export interface DelayFactor {
  factor: string;
  contribution_minutes: number;
  description: string;
}

export interface ETAResponse {
  train_number: string;
  train_name: string;
  date: string;
  prediction_generated_at: string;
  model_version: string;
  overall_delay_minutes: number;
  confidence_score: number;
  remaining_stations: RemainingStation[];
  delay_factors: DelayFactor[];
}

export interface TrainStatus {
  train_number: string;
  train_name: string;
  current_station: Station;
  next_station: Station;
  delay_minutes: number;
  predicted_next_arrival: string;
  scheduled_departure: string;
  status: 'ON_TIME' | 'DELAYED' | 'CRITICAL';
  zone: string;
  speed_kmh?: number;
}

export interface NetworkZoneStatus {
  zone_code: string;
  zone_name: string;
  active_trains: number;
  delayed_trains: number;
  critical_conflicts: number;
  avg_delay_minutes: number;
  status: 'HEALTHY' | 'CONGESTED' | 'DISRUPTED';
}

export interface RouteCongestionSegment {
  segment_id: string;
  from_station: string;
  to_station: string;
  active_trains: number;
  congestion_score: number; // 0 - 100
  status: 'NORMAL' | 'CONGESTED' | 'CONFLICT';
}
