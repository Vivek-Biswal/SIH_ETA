import 'package:flutter/material.dart';
import '../../core/models/journey_view.dart';
import '../../core/theme/app_colors.dart';
import 'passenger_components.dart';

class StationTimeline extends StatelessWidget {
  final List<JourneyStop> stops;
  const StationTimeline({super.key, required this.stops});
  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (var i = 0; i < stops.length; i++)
        _StopTile(entry: stops[i], last: i == stops.length - 1),
    ],
  );
}

class _StopTile extends StatelessWidget {
  final JourneyStop entry;
  final bool last;
  const _StopTile({required this.entry, required this.last});
  @override
  Widget build(BuildContext context) {
    final stop = entry.stop;
    final current = entry.stage == StopStage.current;
    final stage = switch (entry.stage) {
      StopStage.passed => 'Passed',
      StopStage.current => 'Last known station',
      StopStage.upcoming => 'Upcoming',
      StopStage.unknown => 'Progress unknown',
    };
    return Container(
      padding: const EdgeInsets.only(bottom: 18, top: 14),
      decoration: BoxDecoration(
        border: last
            ? null
            : const Border(bottom: BorderSide(color: AppColors.whisperBorder)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 4, right: 14),
            child: Icon(
              current
                  ? Icons.radio_button_checked
                  : entry.stage == StopStage.passed
                  ? Icons.check_circle_outline
                  : Icons.circle_outlined,
              size: 18,
              color: current ? AppColors.liveGreen : AppColors.mutedSteel,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stop.station?.label ?? 'Station unavailable',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  stage,
                  style: TextStyle(
                    fontSize: 12,
                    color: current ? AppColors.liveGreen : AppColors.mutedSteel,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    Text(
                      'Scheduled ${displayTime(stop.scheduledArrival ?? stop.scheduledDeparture)}',
                    ),
                    if (stop.actualArrival != null)
                      Text('Arrived ${displayTime(stop.actualArrival)}'),
                    if (stop.actualDeparture != null)
                      Text('Departed ${displayTime(stop.actualDeparture)}'),
                    if (entry.prediction?.predictedArrival != null &&
                        entry.stage != StopStage.passed &&
                        stop.actualArrival == null)
                      Text(
                        'ETA ${displayTime(entry.prediction!.predictedArrival)}',
                        style: const TextStyle(color: AppColors.brandBlue),
                      ),
                    if (stop.platform != null && stop.platform!.isNotEmpty)
                      Text('Platform ${stop.platform}'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
