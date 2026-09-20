import 'train_models.dart';

enum StopStage { passed, current, upcoming, unknown }

class JourneyStop {
  final RouteStop stop;
  final StationPrediction? prediction;
  final StopStage stage;
  const JourneyStop(this.stop, this.prediction, this.stage);
}

List<JourneyStop> journeyStops(TrainStatus status, ETAModel? eta) {
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
  return [
    for (var i = 0; i < status.route.length; i++)
      JourneyStop(
        status.route[i],
        sameJourney &&
                eta!.hasPredictions &&
                codes[status.route[i].station?.code] == 1
            ? uniquePrediction(eta, status.route[i].station?.code)
            : null,
        status.route[i].hasDeparted || (currentIndex >= 0 && i < currentIndex)
            ? StopStage.passed
            : i == currentIndex
            ? StopStage.current
            : hasProgress &&
                  i >
                      (currentIndex > lastDeparted
                          ? currentIndex
                          : lastDeparted)
            ? StopStage.upcoming
            : StopStage.unknown,
      ),
  ];
}

StationPrediction? uniquePrediction(ETAModel eta, String? code) {
  if (code == null) return null;
  final matches = eta.remainingStations.where((p) => p.station?.code == code);
  return matches.length == 1 ? matches.single : null;
}
