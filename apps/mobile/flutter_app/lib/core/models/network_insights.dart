import 'train_models.dart';

class NetworkInsights {
  final String periodStart, periodEnd, query;
  final int stationCount, interactionCount, highRiskCount;
  final List<StationRisk> stations;
  final List<NetworkInteraction> interactions;

  NetworkInsights.fromJson(Map<String, dynamic> json)
    : periodStart = requiredText(json, 'period_start'),
      periodEnd = requiredText(json, 'period_end'),
      query = json['query'] as String? ?? '',
      stationCount = (json['station_count'] as num).toInt(),
      interactionCount = (json['interaction_count'] as num).toInt(),
      highRiskCount = (json['high_risk_count'] as num).toInt(),
      stations = jsonList(json['stations'], StationRisk.fromJson),
      interactions = jsonList(
        json['interactions'],
        NetworkInteraction.fromJson,
      ) {
    if (json['data_source'] != 'historical' ||
        json['live_available'] != false ||
        DateTime.tryParse(periodStart) == null ||
        DateTime.tryParse(periodEnd) == null) {
      throw const FormatException('Unverified network analysis');
    }
  }
}

double _number(Map<String, dynamic> json, String key) {
  final value = (json[key] as num).toDouble();
  if (!value.isFinite) throw const FormatException('Invalid analysis value');
  return value;
}

class StationRisk {
  final String station, risk;
  final int interactions, flaggedInteractions;
  final double riskScore, bottleneckScore, meanDelay, meanGap;
  StationRisk.fromJson(Map<String, dynamic> json)
    : station = requiredText(json, 'station'),
      risk = requiredText(json, 'risk'),
      interactions = (json['interactions'] as num).toInt(),
      flaggedInteractions = (json['flagged_interactions'] as num).toInt(),
      riskScore = _number(json, 'risk_score'),
      bottleneckScore = _number(json, 'bottleneck_score'),
      meanDelay = _number(json, 'mean_source_delay_minutes'),
      meanGap = _number(json, 'mean_gap_minutes');
}

class NetworkInteraction {
  final String station, serviceDate, sourceTrain, targetTrain, risk;
  final double riskScore, sourceDelay, targetDelay, gap;
  NetworkInteraction.fromJson(Map<String, dynamic> json)
    : station = requiredText(json, 'station'),
      serviceDate = requiredText(json, 'service_date'),
      sourceTrain = requiredText(json, 'source_train'),
      targetTrain = requiredText(json, 'target_train'),
      risk = requiredText(json, 'risk'),
      riskScore = _number(json, 'risk_score'),
      sourceDelay = _number(json, 'source_delay_minutes'),
      targetDelay = _number(json, 'target_delay_minutes'),
      gap = _number(json, 'gap_minutes');
}
