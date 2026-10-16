import 'package:flutter/material.dart';
import '../../core/models/train_models.dart';
import 'passenger_components.dart';

// A time-only schedule has no day offset. Never guess across midnight.
int? arrivalDifference(String? scheduled, String? predicted) {
  if (scheduled == null ||
      predicted == null ||
      !scheduled.contains('T') ||
      !predicted.contains('T')) {
    return null;
  }
  final a = DateTime.tryParse(scheduled), b = DateTime.tryParse(predicted);
  if (a == null || b == null || a.isUtc != b.isUtc) return null;
  return (b.difference(a).inMilliseconds / Duration.millisecondsPerMinute)
      .round();
}

class PassengerArrivalReason {
  final String status, title, summary;
  final List<String> details;
  final String? predicted, actual;
  final int? difference;
  const PassengerArrivalReason(
    this.status,
    this.title,
    this.summary, {
    this.details = const [],
    this.predicted,
    this.actual,
    this.difference,
  });
}

String? _selectedMethod(
  StationPrediction? prediction,
  String? stationMethod,
  ETAModel? evidence,
) =>
    prediction?.predictionMethod ??
    stationMethod ??
    (evidence?.method == 'inference' ? 'schedule_only' : evidence?.method);

/// Uses only the selected stop. A journey-wide explanation cannot establish
/// what happened at this particular station, so it is deliberately not reused.
PassengerArrivalReason passengerArrivalReason({
  required String destination,
  String? scheduled,
  String? predicted,
  String? actual,
  int? predictedDelay,
  int? runningDelay,
  String? stationMethod,
  String? trainStatus,
  StationPrediction? prediction,
  ETAModel? evidence,
  DateTime? now,
}) {
  final clock = now ?? DateTime.now();
  final observed = DateTime.tryParse(evidence?.observationTimestamp ?? '');
  final reason = prediction?.arrivalExplanation;
  if (observed != null && observed.isAfter(clock)) {
    return PassengerArrivalReason(
      'unavailable',
      'Waiting for an arrival update',
      'The latest train update could not be verified. An arrival estimate for $destination is unavailable.',
    );
  }
  final suppliedActual = prediction?.hasConfirmedArrivalField == true
      ? prediction?.actualArrival
      : actual;
  final arrival = DateTime.tryParse(suppliedActual ?? '');
  final confirmedActual =
      arrival != null &&
          suppliedActual!.contains('T') &&
          observed != null &&
          !arrival.isAfter(clock) &&
          !arrival.isAfter(observed)
      ? suppliedActual
      : null;
  if (confirmedActual != null) {
    final delta = arrivalDifference(scheduled, confirmedActual);
    return PassengerArrivalReason(
      'arrived',
      'Arrived at $destination',
      reason?.status == 'arrived' && reason!.summary.isNotEmpty
          ? reason.summary
          : 'Your train arrived at $destination at ${displayTime(confirmedActual)}${delta == null
                ? '.'
                : delta == 0
                ? ', on schedule.'
                : ', ${delta.abs()} minutes ${delta > 0 ? 'late' : 'early'}.'}',
      details: reason?.status == 'arrived' ? reason!.details : const [],
      actual: confirmedActual,
      difference: delta,
    );
  }
  final state = trainStatus?.replaceAll('_', '-').toLowerCase();
  final stopped = switch (state) {
    'not-started' => 'not_started',
    'cancelled' || 'canceled' => 'cancelled',
    'completed' || 'terminated' => 'unavailable',
    _ => null,
  };
  final nonEstimate = ['not_started', 'cancelled', 'skipped', 'unavailable'];
  if (stopped != null ||
      (reason != null && nonEstimate.contains(reason.status))) {
    final status = stopped ?? reason!.status;
    if (reason?.status == status && reason!.summary.isNotEmpty) {
      return PassengerArrivalReason(
        status,
        reason.title,
        reason.summary,
        details: reason.details,
      );
    }
    return switch (status) {
      'not_started' => PassengerArrivalReason(
        status,
        'Journey has not started',
        'Your train has not started this journey. ${scheduled == null ? 'The arrival time at $destination is unavailable.' : 'It is scheduled to reach $destination at ${displayTime(scheduled)}.'}',
      ),
      'cancelled' => PassengerArrivalReason(
        status,
        'Journey cancelled',
        'This journey is cancelled. An arrival time at $destination is not available.',
      ),
      _ => PassengerArrivalReason(
        status,
        'Arrival update unavailable',
        'A new arrival estimate for $destination is not available${state == 'completed' || state == 'terminated' ? ' because this journey has ended' : ''}.',
      ),
    };
  }
  final stale =
      evidence?.source == 'cached' ||
      (observed != null &&
          clock.difference(observed) > const Duration(minutes: 5));
  final knownRunning = [
    'running',
    'in-transit',
    'at-station',
    'arrived',
    'halted',
    'stopped',
    'departed',
    'delayed',
  ].contains(state);
  final method = _selectedMethod(prediction, stationMethod, evidence);
  final value = prediction?.predictedArrival ?? predicted;
  final expected = DateTime.tryParse(value ?? '');
  if (!knownRunning ||
      stale ||
      (evidence != null && observed == null) ||
      !['inference', 'delay_adjusted'].contains(method) ||
      expected == null ||
      expected.isBefore(clock)) {
    return PassengerArrivalReason(
      'unavailable',
      'Waiting for an arrival update',
      stale
          ? 'The last train update is too old to give a reliable arrival time for $destination.'
          : 'A current arrival estimate for $destination is not available.',
      details: [
        if (scheduled != null)
          'Scheduled arrival: ${displayTime(scheduled)}. This is the timetable, not a live estimate.',
      ],
    );
  }
  final delta =
      prediction?.predictedDelayMinutes ??
      arrivalDifference(scheduled, value) ??
      predictedDelay;
  final expectedStatus = delta == null
      ? null
      : delta == 0
      ? 'on_time'
      : delta < 0
      ? 'early'
      : 'delayed';
  if (reason != null &&
      reason.status == expectedStatus &&
      reason.summary.isNotEmpty) {
    return PassengerArrivalReason(
      reason.status,
      reason.title,
      reason.summary,
      details: reason.details,
      predicted: value,
      difference: delta,
    );
  }
  if (delta == null) {
    return PassengerArrivalReason(
      'unavailable',
      'Arrival at $destination',
      'Your train is expected at $destination at ${displayTime(value)}. Its difference from the timetable is unavailable.',
      predicted: value,
    );
  }
  final status = delta == 0
      ? 'on_time'
      : delta < 0
      ? 'early'
      : 'delayed';
  final details = <String>[];
  if (method == 'delay_adjusted' && runningDelay != null) {
    details.add(
      runningDelay == 0
          ? 'The latest train report shows no running delay.'
          : 'The latest train report shows the train is ${runningDelay.abs()} minutes ${runningDelay > 0 ? 'late' : 'early'}. This estimate assumes that continues to $destination.',
    );
  }
  if (delta > 0) {
    details.add('The train service has not reported the cause of this delay.');
  }
  return PassengerArrivalReason(
    status,
    delta == 0
        ? 'On schedule for $destination'
        : '${delta.abs()} minutes ${delta > 0 ? 'late' : 'early'} at $destination',
    'Your train is expected to reach $destination at ${displayTime(value)}${delta == 0 ? ', on schedule.' : ', ${delta.abs()} minutes ${delta > 0 ? 'later' : 'earlier'} than scheduled.'}',
    details: details,
    predicted: value,
    difference: delta,
  );
}

class EtaDisplay extends StatelessWidget {
  final String destination;
  final String? scheduledTime, predictedTime, actualTime;
  final int? delayMinutes, predictedDelayMinutes;
  final String method;
  final String? stationMethod, trainStatus;
  final ETAModel? evidence;
  final StationPrediction? stationPrediction;
  const EtaDisplay({
    super.key,
    required this.destination,
    this.scheduledTime,
    this.predictedTime,
    this.actualTime,
    this.delayMinutes,
    this.predictedDelayMinutes,
    required this.method,
    this.stationMethod,
    this.trainStatus,
    this.evidence,
    this.stationPrediction,
  });

  @override
  Widget build(BuildContext context) {
    final reason = passengerArrivalReason(
      destination: destination,
      scheduled: scheduledTime,
      predicted: predictedTime,
      actual: actualTime,
      predictedDelay: predictedDelayMinutes,
      runningDelay: delayMinutes,
      stationMethod: stationMethod,
      trainStatus: trainStatus,
      prediction: stationPrediction,
      evidence: evidence,
    );
    final actual = reason.actual != null;
    final color = switch (reason.status) {
      'on_time' ||
      'early' ||
      'arrived' => Theme.of(context).colorScheme.primary,
      'delayed' =>
        Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFFFFBB7A)
            : const Color(0xFF9C4300),
      _ => Theme.of(context).colorScheme.onSurfaceVariant,
    };
    final methodForStop = _selectedMethod(
      stationPrediction,
      stationMethod,
      evidence,
    );
    final learned = methodForStop == 'inference' && reason.predicted != null;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: .25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                actual ? Icons.check_circle_outline : Icons.schedule,
                color: color,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  actual ? 'ARRIVAL RECORDED' : 'YOUR ARRIVAL',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            destination,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 20),
          Text(
            actual ? 'Actual arrival' : 'Expected arrival',
            style: TextStyle(color: color),
          ),
          const SizedBox(height: 6),
          Text(
            displayTime(reason.actual ?? reason.predicted),
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Text(
            'Scheduled: ${displayTime(scheduledTime)}',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 10),
          Text(
            reason.title,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(reason.summary, style: const TextStyle(height: 1.5)),
          TextButton.icon(
            onPressed: () => showModalBottomSheet<void>(
              context: context,
              isScrollControlled: true,
              showDragHandle: true,
              builder: (context) => SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Arrival at $destination',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        reason.title,
                        style: TextStyle(
                          color: color,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(reason.summary, style: const TextStyle(height: 1.5)),
                      for (final detail in reason.details)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            detail,
                            style: const TextStyle(height: 1.5),
                          ),
                        ),
                      if (evidence != null) ...[
                        const SizedBox(height: 20),
                        ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          title: const Text('How this estimate was made'),
                          childrenPadding: const EdgeInsets.only(bottom: 12),
                          expandedCrossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              actual
                                  ? 'This is a confirmed arrival record.'
                                  : reason.predicted == null
                                  ? 'A live arrival estimate is not available for this stop.'
                                  : learned
                                  ? 'We used patterns from past journeys and the latest station reports to estimate this arrival.'
                                  : methodForStop == 'stored'
                                  ? 'This arrival was saved earlier. Check the last update time below.'
                                  : 'We added the latest reported running delay to this station’s scheduled arrival.',
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Last train update: ${displayTime(evidence?.observationTimestamp)}',
                            ),
                            Text('Source: ${sourceLabel(evidence?.source)}'),
                            if (learned)
                              if (evidence?.modelMetadata?.validation
                                  case final validation?) ...[
                                const SizedBox(height: 12),
                                if (validation.maeMinutes != null)
                                  Text(
                                    'Average arrival error in past tests: ${validation.maeMinutes!.toStringAsFixed(1)} minutes.',
                                  ),
                                const Text(
                                  'Past test results do not guarantee the accuracy of this arrival.',
                                ),
                              ],
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            icon: const Icon(Icons.info_outline),
            label: const Text('Why this ETA?'),
          ),
        ],
      ),
    );
  }
}
