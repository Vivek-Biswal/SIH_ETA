class Station {
  final String code;
  final String name;

  const Station({required this.code, required this.name});
}

class StationPrediction {
  final Station station;
  final String scheduledArrival;
  final String predictedArrival;
  final int predictedDelayMinutes;
  final double confidence;
  final String platform;

  const StationPrediction({
    required this.station,
    required this.scheduledArrival,
    required this.predictedArrival,
    required this.predictedDelayMinutes,
    required this.confidence,
    required this.platform,
  });
}

class DelayFactor {
  final String factor;
  final int contributionMinutes;
  final String description;

  const DelayFactor({
    required this.factor,
    required this.contributionMinutes,
    required this.description,
  });
}

class ETAModel {
  final String trainNumber;
  final String trainName;
  final String modelVersion;
  final int overallDelayMinutes;
  final double confidenceScore;
  final List<StationPrediction> remainingStations;
  final List<DelayFactor> delayFactors;

  const ETAModel({
    required this.trainNumber,
    required this.trainName,
    this.modelVersion = 'eta-xgboost-v1.2',
    required this.overallDelayMinutes,
    required this.confidenceScore,
    required this.remainingStations,
    required this.delayFactors,
  });
}

class TrainSummary {
  final String trainNumber;
  final String trainName;
  final String origin;
  final String destination;
  final String nextStation;
  final int delayMinutes;
  final String predictedArrival;
  final bool isLive;

  const TrainSummary({
    required this.trainNumber,
    required this.trainName,
    required this.origin,
    required this.destination,
    required this.nextStation,
    required this.delayMinutes,
    required this.predictedArrival,
    this.isLive = true,
  });
}
