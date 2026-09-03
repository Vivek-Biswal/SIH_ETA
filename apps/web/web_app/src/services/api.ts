import { ETAResponse, TrainStatus, NetworkZoneStatus, RouteCongestionSegment } from '../types/api';
import { mockEtaResponse12301, mockTrainsList, mockNetworkZones, mockCongestionSegments } from './mockData';

export class RailwayApiService {
  static async getTrainStatus(trainNo: string): Promise<TrainStatus> {
    await new Promise((res) => setTimeout(res, 200));
    const found = mockTrainsList.find((t) => t.train_number === trainNo);
    return found || mockTrainsList[0];
  }

  static async getTrainETA(trainNo: string): Promise<ETAResponse> {
    await new Promise((res) => setTimeout(res, 250));
    return mockEtaResponse12301;
  }

  static async searchTrains(query?: string): Promise<TrainStatus[]> {
    await new Promise((res) => setTimeout(res, 150));
    if (!query) return mockTrainsList;
    return mockTrainsList.filter(
      (t) =>
        t.train_number.includes(query) ||
        t.train_name.toLowerCase().includes(query.toLowerCase())
    );
  }

  static async getNetworkStatus(): Promise<NetworkZoneStatus[]> {
    await new Promise((res) => setTimeout(res, 200));
    return mockNetworkZones;
  }

  static async getRouteCongestion(routeId?: string): Promise<RouteCongestionSegment[]> {
    await new Promise((res) => setTimeout(res, 200));
    return mockCongestionSegments;
  }
}
