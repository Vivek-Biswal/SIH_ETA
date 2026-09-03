import '../models/train_models.dart';

class MockMobileData {
  static const ETAModel eta12301 = ETAModel(
    trainNumber: '12301',
    trainName: 'Howrah Rajdhani Express',
    overallDelayMinutes: 52,
    confidenceScore: 0.78,
    remainingStations: [
      StationPrediction(
        station: Station(code: 'CNB', name: 'Kanpur Central'),
        scheduledArrival: '11:40',
        predictedArrival: '12:02',
        predictedDelayMinutes: 22,
        confidence: 0.91,
        platform: '1',
      ),
      StationPrediction(
        station: Station(code: 'ALD', name: 'Prayagraj Junction'),
        scheduledArrival: '13:05',
        predictedArrival: '13:24',
        predictedDelayMinutes: 19,
        confidence: 0.88,
        platform: '4',
      ),
      StationPrediction(
        station: Station(code: 'PBH', name: 'Pratapgarh Junction'),
        scheduledArrival: '14:20',
        predictedArrival: '14:40',
        predictedDelayMinutes: 20,
        confidence: 0.85,
        platform: '2',
      ),
      StationPrediction(
        station: Station(code: 'NDLS', name: 'New Delhi'),
        scheduledArrival: '19:55',
        predictedArrival: '20:47',
        predictedDelayMinutes: 52,
        confidence: 0.78,
        platform: '12',
      ),
    ],
    delayFactors: [
      DelayFactor(
        factor: 'Network Congestion',
        contributionMinutes: 38,
        description: 'Severe track congestion between CNB and ALD',
      ),
      DelayFactor(
        factor: 'Turnaround Delay',
        contributionMinutes: 14,
        description: 'Late departure from origin maintenance yard',
      ),
    ],
  );

  static const List<TrainSummary> sampleTrains = [
    TrainSummary(
      trainNumber: '12301',
      trainName: 'Howrah Rajdhani Express',
      origin: 'HWH',
      destination: 'NDLS',
      nextStation: 'CNB (Kanpur Central)',
      delayMinutes: 52,
      predictedArrival: '20:47',
    ),
    TrainSummary(
      trainNumber: '12259',
      trainName: 'Sealdah Duronto Express',
      origin: 'SDAH',
      destination: 'NDLS',
      nextStation: 'DDU (Pt Deen Dayal)',
      delayMinutes: 0,
      predictedArrival: '11:15',
    ),
    TrainSummary(
      trainNumber: '22221',
      trainName: 'CSMT Rajdhani Express',
      origin: 'CSMT',
      destination: 'NZM',
      nextStation: 'BPL (Bhopal)',
      delayMinutes: 23,
      predictedArrival: '15:45',
    ),
  ];
}
