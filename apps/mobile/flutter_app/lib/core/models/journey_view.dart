import 'train_models.dart';

enum StopStage { passed, current, upcoming, unknown }

class JourneyStop {
  final RouteStop stop;
  final StationPrediction? prediction;
  final StopStage stage;
  final String? confirmedArrival;
  const JourneyStop(
    this.stop,
    this.prediction,
    this.stage, [
    this.confirmedArrival,
  ]);
}

List<JourneyStop> journeyStops(
  TrainStatus status,
  ETAModel? eta, {
  DateTime? now,
}) {
  final codes = <String, int>{};
  for (final stop in status.route) {
    final code = stop.station?.code;
    if (code != null) codes[code] = (codes[code] ?? 0) + 1;
  }
  final currentCode = status.currentStation?.code;
  final currentIndex = currentCode == null || codes[currentCode] != 1
      ? -1
      : status.route.indexWhere((s) => s.station?.code == currentCode);
  final lastDeparted = status.route.lastIndexWhere((s) => s.hasDeparted);
  final hasProgress = currentIndex >= 0 || lastDeparted >= 0;
  final sameJourney =
      eta?.date == status.date && eta?.trainNumber == status.trainNumber;
  final result = <JourneyStop>[];
  for (var i = 0; i < status.route.length; i++) {
    final stop = status.route[i];
    final stage = i == currentIndex
        ? StopStage.current
        : stop.hasDeparted || (currentIndex >= 0 && i < currentIndex)
        ? StopStage.passed
        : hasProgress &&
              i > (currentIndex > lastDeparted ? currentIndex : lastDeparted)
        ? StopStage.upcoming
        : StopStage.unknown;
    final matched =
        sameJourney &&
            (codes[stop.station?.code] == 1 || stop.routeSequence != null)
        ? uniquePrediction(
            eta!,
            stop.station?.code,
            sequence: stop.routeSequence,
          )
        : null;
    // New responses carry a reason even when a live ETA cannot be calculated.
    // Older timetable-only responses retain their original conservative guard.
    final prediction =
        matched?.arrivalExplanation != null ||
            (eta?.hasPredictions == true &&
                ![
                  'not-started',
                  'cancelled',
                  'canceled',
                  'completed',
                  'terminated',
                ].contains(status.status.replaceAll('_', '-').toLowerCase()))
        ? matched
        : null;
    final candidate = matched?.hasConfirmedArrivalField == true
        ? matched?.actualArrival
        : stop.arrivalConfirmed == true ||
              (stop.arrivalConfirmed == null &&
                  (stage == StopStage.passed || stop.hasDeparted))
        ? stop.actualArrival
        : null;
    final observed = DateTime.tryParse(status.observedAt ?? '');
    final actual = DateTime.tryParse(candidate ?? '');
    final confirmed =
        candidate != null &&
            candidate.contains('T') &&
            actual != null &&
            !actual.isAfter(now ?? DateTime.now()) &&
            observed != null &&
            !actual.isAfter(observed)
        ? candidate
        : null;
    result.add(JourneyStop(stop, prediction, stage, confirmed));
  }
  return result;
}

StationPrediction? uniquePrediction(
  ETAModel eta,
  String? code, {
  int? sequence,
}) {
  if (code == null) return null;
  final matches = eta.remainingStations.where((p) => p.station?.code == code);
  if (sequence != null) {
    final exact = matches.where((p) => p.routeSequence == sequence);
    if (exact.length == 1) return exact.single;
    if (matches.any((p) => p.routeSequence != null)) return null;
  }
  return matches.length == 1 ? matches.single : null;
}
