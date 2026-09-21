import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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
      padding: EdgeInsets.only(bottom: 18, top: 14),
      decoration: BoxDecoration(
        border: last
            ? null
            : Border(
                bottom: BorderSide(
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
              ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(top: 4, right: 14),
            child: Icon(
              current
                  ? Icons.radio_button_checked
                  : entry.stage == StopStage.passed
                  ? Icons.check_circle_outline
                  : Icons.circle_outlined,
              size: 18,
              color: current
                  ? AppColors.liveGreen
                  : Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stop.station?.label ?? 'Station unavailable',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                SizedBox(height: 5),
                Text(
                  stage,
                  style: TextStyle(
                    fontSize: 12,
                    color: current
                        ? AppColors.liveGreen
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                if (stop.station != null)
                  TextButton.icon(
                    icon: const Icon(Icons.directions_outlined, size: 18),
                    label: const Text('Directions'),
                    onPressed: () async {
                      final url = Uri.https('www.google.com', '/maps/dir/', {
                        'api': '1',
                        'destination':
                            '${stop.station!.name} railway station ${stop.station!.code} India',
                      });
                      try {
                        if (!await launchUrl(
                          url,
                          mode: LaunchMode.externalApplication,
                        )) {
                          throw StateError('unavailable');
                        }
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Could not open maps on this device.',
                              ),
                            ),
                          );
                        }
                      }
                    },
                  ),
                SizedBox(height: 10),
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
                        style: TextStyle(color: AppColors.brandBlue),
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
