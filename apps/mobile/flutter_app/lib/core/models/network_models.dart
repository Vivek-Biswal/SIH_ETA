import 'train_models.dart';

class BottleneckModel {
  final String location;
  final String timeWindow;
  final String risk;
  final int affectedTrains;
  final String reason;
  final double? confidence;
  final ApiDataState dataState;

  const BottleneckModel({
    required this.location,
    required this.timeWindow,
    required this.risk,
    required this.affectedTrains,
    required this.reason,
    this.confidence,
    this.dataState = ApiDataState.live,
  });

  factory BottleneckModel.fromJson(Map<String, dynamic> json) {
    return BottleneckModel(
      location: json['location'] ?? '',
      timeWindow: json['time_window'] ?? '',
      risk: json['risk'] ?? '',
      affectedTrains: json['affected_trains'] ?? 0,
      reason: json['reason'] ?? '',
      confidence: json['confidence']?.toDouble(),
      dataState: _parseDataState(json['data_state']),
    );
  }
}

class WhatIfRequest {
  final String trainId;
  final String action;
  final Map<String, dynamic> parameters;

  const WhatIfRequest({
    required this.trainId,
    required this.action,
    required this.parameters,
  });

  Map<String, dynamic> toJson() => {
        'train_id': trainId,
        'action': action,
        'parameters': parameters,
      };
}

class SimulationRequest {
  final String scenarioType;
  final Map<String, dynamic> parameters;

  const SimulationRequest({
    required this.scenarioType,
    required this.parameters,
  });

  Map<String, dynamic> toJson() => {
        'scenario_type': scenarioType,
        'parameters': parameters,
      };
}

class ScenarioModel {
  final String scenarioId;
  final String status;
  final Map<String, dynamic> results;

  const ScenarioModel({
    required this.scenarioId,
    required this.status,
    required this.results,
  });

  factory ScenarioModel.fromJson(Map<String, dynamic> json) {
    return ScenarioModel(
      scenarioId: json['scenario_id'] ?? '',
      status: json['status'] ?? '',
      results: json['results'] ?? {},
    );
  }
}

class NetworkZoneStatus {
  final String zoneCode;
  final String zoneName;
  final int activeTrains;
  final int delayedTrains;
  final int criticalConflicts;
  final int avgDelayMinutes;
  final String status;

  const NetworkZoneStatus({
    required this.zoneCode,
    required this.zoneName,
    required this.activeTrains,
    required this.delayedTrains,
    required this.criticalConflicts,
    required this.avgDelayMinutes,
    required this.status,
  });

  factory NetworkZoneStatus.fromJson(Map<String, dynamic> json) {
    return NetworkZoneStatus(
      zoneCode: json['zone_code'] ?? '',
      zoneName: json['zone_name'] ?? '',
      activeTrains: json['active_trains'] ?? 0,
      delayedTrains: json['delayed_trains'] ?? 0,
      criticalConflicts: json['critical_conflicts'] ?? 0,
      avgDelayMinutes: json['avg_delay_minutes'] ?? 0,
      status: json['status'] ?? '',
    );
  }
}

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
