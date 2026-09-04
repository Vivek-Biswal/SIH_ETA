import { ETAResponse, TrainStatus, NetworkZoneStatus, RouteCongestionSegment } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export class RailwayApiService {
  static async getTrainStatus(trainNo: string): Promise<TrainStatus> {
    const res = await fetch(`${API_BASE_URL}/trains/${trainNo}/status`);
    if (!res.ok) throw new Error('Failed to fetch train status');
    return res.json();
  }

  static async getTrainETA(trainNo: string): Promise<ETAResponse> {
    const res = await fetch(`${API_BASE_URL}/trains/${trainNo}/eta`);
    if (!res.ok) throw new Error('Failed to fetch train ETA');
    return res.json();
  }

  static async searchTrains(query?: string): Promise<TrainStatus[]> {
    // Note: Backend might require from_station and to_station, providing defaults for UI to work
    const fromStation = "NDLS";
    const toStation = "CNB";
    const res = await fetch(`${API_BASE_URL}/trains/search?from_station=${fromStation}&to_station=${toStation}`);
    if (!res.ok) throw new Error('Failed to search trains');
    const data = await res.json();
    return data.data || [];
  }

  static async getNetworkStatus(): Promise<NetworkZoneStatus[]> {
    const res = await fetch(`${API_BASE_URL}/network/status`);
    if (!res.ok) throw new Error('Failed to fetch network status');
    return res.json();
  }

  static async getRouteCongestion(routeId: string = "NDLS-GZB"): Promise<RouteCongestionSegment[]> {
    const res = await fetch(`${API_BASE_URL}/network/routes/${routeId}/congestion`);
    if (!res.ok) throw new Error('Failed to fetch route congestion');
    return res.json();
  }

  // --- New Core Intelligence Endpoints ---

  static async getDelayDna(trainNo: string) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/trains/${trainNo}/delay-dna`);
    if (!res.ok) throw new Error('Failed to fetch delay DNA');
    return res.json();
  }

  static async getRecovery(trainNo: string) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/trains/${trainNo}/recovery`);
    if (!res.ok) throw new Error('Failed to fetch recovery plan');
    return res.json();
  }

  static async getPropagation(trainNo: string) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/trains/${trainNo}/propagation`);
    if (!res.ok) throw new Error('Failed to fetch delay propagation');
    return res.json();
  }

  static async getBottlenecks() {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/network/bottlenecks`);
    if (!res.ok) throw new Error('Failed to fetch network bottlenecks');
    return res.json();
  }

  static async runWhatIf(trainNo: string, action: string, parameters: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/what-if`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ train_id: trainNo, action, parameters }),
    });
    if (!res.ok) throw new Error('Failed to run what-if scenario');
    return res.json();
  }

  static async runSimulation(scenarioType: string, parameters: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/simulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_type: scenarioType, parameters }),
    });
    if (!res.ok) throw new Error('Failed to run simulation');
    return res.json();
  }

  static async getScenario(scenarioId: string) {
    const res = await fetch(`${API_BASE_URL.replace('/api/v1', '/api')}/scenarios/${scenarioId}`);
    if (!res.ok) throw new Error('Failed to fetch scenario');
    return res.json();
  }
}
