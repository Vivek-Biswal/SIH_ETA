enum ApiDataState { unknown, live, mock, cached, unavailable, error }

ApiDataState parseDataState(Object? value) => switch (value) {
  'live' => ApiDataState.live,
  'mock' || 'demo' => ApiDataState.mock,
  'cached' => ApiDataState.cached,
  'unavailable' => ApiDataState.unavailable,
  'error' => ApiDataState.error,
  _ => ApiDataState.unknown,
};

Map<String, dynamic> jsonObject(dynamic value) {
  if (value is! Map<String, dynamic>) {
    throw const FormatException('Expected an object');
  }
  return value;
}

String requiredText(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('Missing or invalid $key');
  }
  return value;
}

List<T> jsonList<T>(dynamic value, T Function(Map<String, dynamic>) parse) {
  if (value is! List) throw const FormatException('Expected a list');
  return value.map((item) => parse(jsonObject(item))).toList();
}

String sourceLabel(String? source) => switch (source) {
  'demo' => 'Demo data',
  'database' => 'Database records',
  _ => 'Source unverified',
};

class Station {
  final String code;
  final String name;
  const Station({required this.code, required this.name});
  factory Station.fromJson(Map<String, dynamic> json) => Station(
    code: requiredText(json, 'code'),
    name: json['name'] as String? ?? '',
  );
  String get label => name.isEmpty ? code : '$name ($code)';
}

Station? stationFrom(dynamic value) =>
    value == null ? null : Station.fromJson(jsonObject(value));

class TrainSummary {
  final String trainNumber;
  final String trainName;
  final Station? origin;
  final Station? destination;
  final String? departureTime;
  final String? arrivalTime;
  const TrainSummary({
    required this.trainNumber,
    required this.trainName,
    this.origin,
    this.destination,
    this.departureTime,
    this.arrivalTime,
  });
  factory TrainSummary.fromJson(Map<String, dynamic> json) => TrainSummary(
    trainNumber: requiredText(json, 'train_number'),
    trainName: requiredText(json, 'train_name'),
    origin: stationFrom(json['from_station']),
    destination: stationFrom(json['to_station']),
    departureTime: json['departure_time'] as String?,
    arrivalTime: json['arrival_time'] as String?,
  );
}

class TrainSearchPage {
  final int total;
  final int page;
  final int limit;
  final String? source;
  final List<TrainSummary> trains;
  TrainSearchPage.fromJson(Map<String, dynamic> json)
    : total = (json['total'] as num).toInt(),
      page = (json['page'] as num).toInt(),
      limit = (json['limit'] as num).toInt(),
      source = json['data_source'] as String?,
      trains = jsonList(json['trains'], TrainSummary.fromJson);
  bool get hasNext => page * limit < total;
}

class RouteStop {
  final Station? station;
  final String? scheduledArrival;
  final String? scheduledDeparture;
  final String? actualArrival;
  final String? actualDeparture;
  final int? delayMinutes;
  final bool hasDeparted;
  final String? platform;
  RouteStop.fromJson(Map<String, dynamic> json)
    : station = stationFrom(json['station']),
      scheduledArrival = json['scheduled_arrival'] as String?,
      scheduledDeparture = json['scheduled_departure'] as String?,
      actualArrival = json['actual_arrival'] as String?,
      actualDeparture = json['actual_departure'] as String?,
      delayMinutes = (json['delay_minutes'] as num?)?.toInt(),
      hasDeparted = json['has_departed'] as bool? ?? false,
      platform = json['platform'] as String?;
}

class TrainStatus {
  final String trainNumber;
  final String trainName;
  final String? date;
  final String? source;
  final Station? currentStation;
  final String? observedAt;
  final bool hasObservation;
  final int? delay;
  final String status;
  final List<RouteStop> route;
  TrainStatus.fromJson(Map<String, dynamic> json)
    : trainNumber = requiredText(json, 'train_number'),
      trainName = requiredText(json, 'train_name'),
      date = json['date'] as String?,
      source = json['data_source'] as String?,
      currentStation = stationFrom(json['current_station']),
      observedAt = json['last_known_location'] == null
          ? null
          : jsonObject(json['last_known_location'])['updated_at'] as String?,
      hasObservation = json['last_known_location'] != null,
      delay = json['last_known_location'] == null
          ? null
          : (jsonObject(json['last_known_location'])['delay_minutes'] as num?)
                ?.toInt(),
      status = json['status'] as String? ?? 'unknown',
      route = jsonList(json['route'], RouteStop.fromJson);
}

class StationPrediction {
  final Station? station;
  final String? scheduledArrival;
  final String? predictedArrival;
  final int? predictedDelayMinutes;
  StationPrediction.fromJson(Map<String, dynamic> json)
    : station = stationFrom(json['station']),
      scheduledArrival = json['scheduled_arrival'] as String?,
      predictedArrival = json['predicted_arrival'] as String?,
      predictedDelayMinutes = (json['predicted_delay_minutes'] as num?)
          ?.toInt();
}

class DelayFactor {
  final String factor;
  final int contributionMinutes;
  final String description;
  DelayFactor.fromJson(Map<String, dynamic> json)
    : factor = json['factor'] as String? ?? '',
      contributionMinutes =
          (json['contribution_minutes'] as num?)?.toInt() ?? 0,
      description = json['description'] as String? ?? '';
}

class ETAModel {
  final String trainNumber;
  final String trainName;
  final String? date;
  final String? generatedAt;
  final String? source;
  final String method;
  final String? modelVersion;
  final List<StationPrediction> remainingStations;
  final List<DelayFactor> delayFactors;
  ETAModel.fromJson(Map<String, dynamic> json)
    : trainNumber = requiredText(json, 'train_number'),
      trainName = requiredText(json, 'train_name'),
      date = json['date'] as String?,
      generatedAt = json['prediction_generated_at'] as String?,
      source = json['data_source'] as String?,
      method = json['prediction_method'] as String? ?? 'unknown',
      modelVersion = json['model_version'] as String?,
      remainingStations = jsonList(
        json['remaining_stations'],
        StationPrediction.fromJson,
      ),
      delayFactors = jsonList(
        json['delay_factors'] ?? [],
        DelayFactor.fromJson,
      );

  bool get hasPredictions => method == 'stored' || method == 'inference';
  String get methodLabel => switch (method) {
    'schedule_only' => 'Schedule only · adjusted ETA unavailable',
    'stored' => 'Stored prediction',
    'inference' => 'Arrival estimate',
    _ => 'Prediction method unverified',
  };
}

// Retained contracts for existing optional intelligence integrations.
class DelayDnaModel {
  final String trainId;
  final List<DelayFactor> contributors;
  final ApiDataState dataState;
  DelayDnaModel.fromJson(Map<String, dynamic> json)
    : trainId = json['train_id'] as String? ?? '',
      contributors = jsonList(json['contributors'] ?? [], DelayFactor.fromJson),
      dataState = parseDataState(json['data_state']);
}

class RecoveryModel {
  final int currentDelay;
  final int expectedRecovery;
  final int expectedRemainingDelay;
  final double? confidence;
  final ApiDataState dataState;
  RecoveryModel.fromJson(Map<String, dynamic> json)
    : currentDelay = (json['current_delay'] as num?)?.toInt() ?? 0,
      expectedRecovery = (json['expected_recovery'] as num?)?.toInt() ?? 0,
      expectedRemainingDelay =
          (json['expected_remaining_delay'] as num?)?.toInt() ?? 0,
      confidence = (json['confidence'] as num?)?.toDouble(),
      dataState = parseDataState(json['data_state']);
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
  PropagationModel.fromJson(Map<String, dynamic> json)
    : sourceTrain = json['source_train'] as String? ?? '',
      affectedTrain = json['affected_train'] as String? ?? '',
      affectedStation = json['affected_station'] as String? ?? '',
      predictedDelay = (json['predicted_delay'] as num?)?.toInt() ?? 0,
      timeWindow = json['time_window'] as String? ?? '',
      risk = json['risk'] as String? ?? 'unknown',
      confidence = (json['confidence'] as num?)?.toDouble(),
      dataState = parseDataState(json['data_state']);
}
