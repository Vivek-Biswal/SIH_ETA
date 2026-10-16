import 'package:flutter/material.dart';
import '../../core/models/train_models.dart';
import 'passenger_components.dart';
import 'delay_examples.dart';

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
  return b.difference(a).inMinutes;
}

class EtaDisplay extends StatelessWidget {
  final String destination;
  final String? scheduledTime, predictedTime, actualTime;
  final int? delayMinutes, predictedDelayMinutes;
  final String method;
  final String? stationMethod;
  final ETAModel? evidence;
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
    this.evidence,
  });
  @override
  Widget build(BuildContext context) {
    final actual = actualTime != null && actualTime!.isNotEmpty;
    final predicted = predictedTime != null && predictedTime!.isNotEmpty;
    final delta =
        arrivalDifference(scheduledTime, actual ? actualTime : predictedTime) ??
        (predicted ? predictedDelayMinutes : null);
    final orange = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFFFFBB7A)
        : const Color(0xFF9C4300);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF251B13)
            : const Color(0xFFFFF3E7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: orange.withValues(alpha: .4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.schedule, color: orange),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  actual ? 'ARRIVAL RECORDED' : 'ARRIVAL OUTLOOK',
                  style: TextStyle(
                    color: orange,
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
            actual ? 'Actual arrival' : 'Predicted arrival',
            style: TextStyle(color: orange),
          ),
          const SizedBox(height: 6),
          Text(
            displayTime(actual ? actualTime : predictedTime),
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Text(
            'Scheduled: ${displayTime(scheduledTime)}',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            delta == null
                ? 'Arrival difference unavailable'
                : delta == 0
                ? 'Arrival matches the schedule'
                : '${delta.abs()} min ${delta > 0 ? "later" : "earlier"} than scheduled',
            style: TextStyle(color: orange, fontWeight: FontWeight.w600),
          ),
          const Divider(height: 28),
          Text('Last reported running delay: ${delayLabel(delayMinutes)}'),
          if (!actual && !predicted)
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('An adjusted arrival prediction is not available.'),
            ),
          const SizedBox(height: 8),
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
                      const Text(
                        'Why this ETA?',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Method: ${switch (stationMethod) {
                          'inference' => 'Trained model estimate',
                          'delay_adjusted' => 'Observed-delay estimate',
                          'schedule_only' => 'Timetable only',
                          _ => method,
                        }}',
                      ),
                      const SizedBox(height: 12),
                      Text(
                        (stationMethod == 'delay_adjusted' &&
                                    evidence?.method == 'inference'
                                ? 'This stop uses its scheduled arrival plus the latest reported delay because it is outside the trained model’s coverage. The estimate assumes that delay continues.'
                                : evidence?.explanation) ??
                            switch (evidence?.method) {
                              'delay_adjusted' =>
                                'Scheduled arrival plus the latest reported running delay. This estimate assumes the delay persists; it does not assume recovery, congestion or weather effects.',
                              'schedule_only' =>
                                'Only timetable information is available. The service has not supplied a delay-adjusted arrival prediction.',
                              'stored' =>
                                'This arrival was retrieved from stored predictions. It has not necessarily been recalculated from a fresh observation.',
                              'inference' =>
                                'The service reports a computed prediction. Only the evidence returned with that response is shown below.',
                              _ =>
                                'The service has not supplied a verified prediction method.',
                            },
                        style: const TextStyle(height: 1.5),
                      ),
                      if (evidence?.modelMetadata case final metadata?) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Model status: ${metadata.status.replaceAll('_', ' ')}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (metadata.reason != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            metadata.reason!,
                            style: const TextStyle(height: 1.5),
                          ),
                        ],
                        if (metadata.name != null)
                          Text('Model: ${metadata.name}'),
                        if (metadata.trainingCutoff != null)
                          Text(
                            'Training data through: ${metadata.trainingCutoff}',
                          ),
                        if (metadata.validation case final validation?) ...[
                          if (validation.maeMinutes != null ||
                              validation.rmseMinutes != null) ...[
                            const SizedBox(height: 12),
                            const Text(
                              'Historical validation',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                            if (validation.maeMinutes != null)
                              Text(
                                'Average absolute error: ${validation.maeMinutes!.toStringAsFixed(1)} min',
                              ),
                            if (validation.baselineMaeMinutes != null)
                              Text(
                                'Previous approach: ${validation.baselineMaeMinutes!.toStringAsFixed(1)} min average absolute error',
                              ),
                            if (validation.rmseMinutes != null)
                              Text(
                                'RMSE: ${validation.rmseMinutes!.toStringAsFixed(1)} min',
                              ),
                            if (validation.testJourneys != null)
                              Text(
                                'Evaluated on ${validation.testJourneys} held-out journeys.',
                              ),
                            const Text(
                              'These results describe past test journeys; the error for this arrival can differ.',
                              style: TextStyle(height: 1.5),
                            ),
                          ],
                        ],
                      ],
                      const SizedBox(height: 16),
                      Text(
                        'Observation: ${displayTime(evidence?.observationTimestamp)}',
                      ),
                      Text(
                        'Prediction generated: ${displayTime(evidence?.generatedAt)}',
                      ),
                      Text('Source: ${sourceLabel(evidence?.source)}'),
                      if (evidence?.modelVersion != null)
                        Text('Version: ${evidence!.modelVersion}'),
                      const SizedBox(height: 16),
                      const Text(
                        'Reported evidence',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      if (evidence == null ||
                          evidence!.delayFactors
                              .where((f) => f.factor != 'historical_delay')
                              .isEmpty)
                        const Text(
                          'No verified cause of the delay was supplied. Current running delay alone does not explain why a train is late.',
                          style: TextStyle(height: 1.5),
                        ),
                      for (final factor
                          in evidence?.delayFactors.where(
                                (f) => f.factor != 'historical_delay',
                              ) ??
                              <DelayFactor>[])
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            '${factor.factor.replaceAll('_', ' ')}: ${factor.description} (${factor.contributionMinutes > 0 ? "+" : ""}${factor.contributionMinutes} min)',
                          ),
                        ),
                      const SizedBox(height: 12),
                      const Text(
                        'Weather, signal holds and congestion are not assumed. Reported factors may not explain the entire difference between the timetable and prediction.',
                        style: TextStyle(height: 1.5),
                      ),
                      const DelayExamples(),
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
