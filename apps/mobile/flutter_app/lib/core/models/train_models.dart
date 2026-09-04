enum ApiDataState { live, mock, cached, unavailable, error }

ApiDataState _parseDataState(String? state) {
  switch (state?.toLowerCase()) {
    case 'mock':
      return ApiDataState.mock;
    case 'cached':
      return ApiDataState.cached;
    case 'unavailable':
      return ApiDataState.unavailable;
    case 'error':
      return ApiDataState.error;
    case 'live':
    default:
      return ApiDataState.live;
  }
}

class Station {
  final String code;
  final String name;

  const Station({required this.code, required this.name});

  factory Station.fromJson(Map<String, dynamic> json) {
    return Station(
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'code': code,
        'name': name,
      };
}

class StationPrediction {
  final Station station;
  final String scheduledArrival;
  final String predictedArrival;
  final int predictedDelayMinutes;
  final double? confidence;
  final String platform;

  const StationPrediction({
    required this.station,
    required this.scheduledArrival,
    required this.predictedArrival,
    required this.predictedDelayMinutes,
    this.confidence,
    required this.platform,
  });

  factory StationPrediction.fromJson(Map<String, dynamic> json) {
    return StationPrediction(
      station: json['station'] != null
          ? Station.fromJson(json['station'])
          : const Station(code: '', name: ''),
      scheduledArrival: json['scheduled_arrival'] ?? '',
      predictedArrival: json['predicted_arrival'] ?? '',
      predictedDelayMinutes: json['predicted_delay_minutes'] ?? 0,
      confidence: json['prediction_confidence']?.toDouble(),
      platform: json['platform'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'station': station.toJson(),
        'scheduled_arrival': scheduledArrival,
        'predicted_arrival': predictedArrival,
        'predicted_delay_minutes': predictedDelayMinutes,
        'prediction_confidence': confidence,
        'platform': platform,
      };
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

  factory DelayFactor.fromJson(Map<String, dynamic> json) {
    return DelayFactor(
      factor: json['factor'] ?? '',
      contributionMinutes: json['contribution_minutes'] ?? 0,
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'factor': factor,
        'contribution_minutes': contributionMinutes,
        'description': description,
      };
}

class ETAModel {
  final String trainNumber;
  final String trainName;
  final String modelVersion;
  final int overallDelayMinutes;
  final double? confidenceScore;
  final List<StationPrediction> remainingStations;
  final List<DelayFactor> delayFactors;

  const ETAModel({
    required this.trainNumber,
    required this.trainName,
    this.modelVersion = 'eta-xgboost-v1.2',
    required this.overallDelayMinutes,
    this.confidenceScore,
    required this.remainingStations,
    required this.delayFactors,
  });

  factory ETAModel.fromJson(Map<String, dynamic> json) {
    return ETAModel(
      trainNumber: json['train_number'] ?? '',
      trainName: json['train_name'] ?? '',
      modelVersion: json['model_version'] ?? '',
      overallDelayMinutes: json['overall_delay_minutes'] ?? 0,
      confidenceScore: json['confidence_score']?.toDouble(),
      remainingStations: (json['remaining_stations'] as List?)
              ?.map((e) => StationPrediction.fromJson(e))
              .toList() ??
          [],
      delayFactors: (json['delay_factors'] as List?)
              ?.map((e) => DelayFactor.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'train_number': trainNumber,
        'train_name': trainName,
        'model_version': modelVersion,
        'overall_delay_minutes': overallDelayMinutes,
        'confidence_score': confidenceScore,
        'remaining_stations': remainingStations.map((e) => e.toJson()).toList(),
        'delay_factors': delayFactors.map((e) => e.toJson()).toList(),
      };
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

  factory TrainSummary.fromJson(Map<String, dynamic> json) {
    // Handling nested station objects or flat structures based on backend payload
    String nextStn = json['next_station'] is Map 
        ? json['next_station']['name'] 
        : (json['next_station'] ?? '');
        
    return TrainSummary(
      trainNumber: json['train_number'] ?? '',
      trainName: json['train_name'] ?? '',
      origin: json['origin'] ?? '',
      destination: json['destination'] ?? '',
      nextStation: nextStn,
      delayMinutes: json['delay_minutes'] ?? 0,
      predictedArrival: json['predicted_next_arrival'] ?? '',
      isLive: json['is_live'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'train_number': trainNumber,
        'train_name': trainName,
        'origin': origin,
        'destination': destination,
        'next_station': nextStation,
        'delay_minutes': delayMinutes,
        'predicted_next_arrival': predictedArrival,
        'is_live': isLive,
      };
}

class DelayDnaModel {
  final String trainId;
  final List<DelayFactor> contributors;
  final ApiDataState dataState;

  const DelayDnaModel({
    required this.trainId,
    required this.contributors,
    this.dataState = ApiDataState.live,
  });

  factory DelayDnaModel.fromJson(Map<String, dynamic> json) {
    return DelayDnaModel(
      trainId: json['train_id'] ?? '',
      contributors: (json['contributors'] as List?)
              ?.map((e) => DelayFactor.fromJson(e))
              .toList() ??
          [],
      dataState: _parseDataState(json['data_state']),
    );
  }
}

class RecoveryModel {
  final int currentDelay;
  final int expectedRecovery;
  final int expectedRemainingDelay;
  final double? confidence;
  final ApiDataState dataState;

  const RecoveryModel({
    required this.currentDelay,
    required this.expectedRecovery,
    required this.expectedRemainingDelay,
    this.confidence,
    this.dataState = ApiDataState.live,
  });

  factory RecoveryModel.fromJson(Map<String, dynamic> json) {
    return RecoveryModel(
      currentDelay: json['current_delay'] ?? 0,
      expectedRecovery: json['expected_recovery'] ?? 0,
      expectedRemainingDelay: json['expected_remaining_delay'] ?? 0,
      confidence: json['confidence']?.toDouble(),
      dataState: _parseDataState(json['data_state']),
    );
  }
}

class PropagationModel {
  final String sourceTrain;
  final String affectedTrain;
  final String affectedStation;
  final int predictedDelay;
  final String timeWindow;
  final String risk;
  final double? confidence;
  final ApiDataState dataState;

  const PropagationModel({
    required this.sourceTrain,
    required this.affectedTrain,
    required this.affectedStation,
    required this.predictedDelay,
    required this.timeWindow,
    required this.risk,
    this.confidence,
    this.dataState = ApiDataState.live,
  });

  factory PropagationModel.fromJson(Map<String, dynamic> json) {
    return PropagationModel(
      sourceTrain: json['source_train'] ?? '',
      affectedTrain: json['affected_train'] ?? '',
      affectedStation: json['affected_station'] ?? '',
      predictedDelay: json['predicted_delay'] ?? 0,
      timeWindow: json['time_window'] ?? '',
      risk: json['risk'] ?? '',
      confidence: json['confidence']?.toDouble(),
      dataState: _parseDataState(json['data_state']),
    );
  }
}
