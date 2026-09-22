import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/models/journey_view.dart';
import 'passenger_components.dart';

bool isPassingEntry(JourneyStop entry) {
  final a = entry.stop.scheduledArrival;
  final d = entry.stop.scheduledDeparture;
  if (a == null || d == null) return false;
  final arrival = DateTime.tryParse(a);
  final departure = DateTime.tryParse(d);
  if (arrival != null && departure != null) return arrival == departure;
  final time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$');
  return time.hasMatch(a) &&
      time.hasMatch(d) &&
      (a.length == 5 ? '$a:00' : a) == (d.length == 5 ? '$d:00' : d);
}

class StationTimeline extends StatefulWidget {
  final List<JourneyStop> stops;
  const StationTimeline({super.key, required this.stops});
  @override
  State<StationTimeline> createState() => _StationTimelineState();
}

class _StationTimelineState extends State<StationTimeline> {
  bool _showAll = false;
  @override
  Widget build(BuildContext context) {
    final stops = [
      for (var i = 0; i < widget.stops.length; i++)
        if (_showAll ||
            i == 0 ||
            i == widget.stops.length - 1 ||
            widget.stops[i].stage == StopStage.current ||
            !isPassingEntry(widget.stops[i]))
          widget.stops[i],
    ];
    final hidden = widget.stops.length - stops.length;
    final current = stops.indexWhere((s) => s.stage == StopStage.current);
    final height = 190.0 * MediaQuery.textScalerOf(context).scale(1);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (hidden > 0 || _showAll)
          TextButton.icon(
            key: const Key('toggle-intermediate'),
            onPressed: () => setState(() => _showAll = !_showAll),
            icon: Icon(_showAll ? Icons.unfold_less : Icons.unfold_more),
            label: Text(
              _showAll
                  ? 'Hide intermediate stations'
                  : 'Show $hidden intermediate stations',
            ),
          ),
        Stack(
          children: [
            Column(
              children: [
                for (var i = 0; i < stops.length; i++)
                  SizedBox(
                    height: height,
                    child: _StopTile(
                      entry: stops[i],
                      last: i == stops.length - 1,
                    ),
                  ),
              ],
            ),
            if (current >= 0)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeInOut,
                left: 54,
                top: current * height + 14,
                child: Tooltip(
                  message: 'Last reported station',
                  child: CircleAvatar(
                    key: ValueKey(
                      'train-marker-${stops[current].stop.station?.code}',
                    ),
                    radius: 15,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    child: Icon(
                      Icons.train_rounded,
                      size: 20,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  ),
                ),
              ),
          ],
        ),
        Text(
          'The marker follows reported station updates. Intermediate entries have equal scheduled arrival and departure times.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _StopTile extends StatelessWidget {
  final JourneyStop entry;
  final bool last;
  const _StopTile({required this.entry, required this.last});

  Widget _time(
    BuildContext context,
    String label,
    String? scheduled,
    String? actual, {
    bool predicted = false,
  }) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall,
      ),
      Text(
        scheduled == null ? '—' : displayTime(scheduled),
        style: const TextStyle(fontSize: 11),
      ),
      if (actual != null) ...[
        const SizedBox(height: 6),
        Text(
          predicted ? 'ETA' : 'Actual',
          style: Theme.of(context).textTheme.labelSmall,
        ),
        Text(
          displayTime(actual),
          style: TextStyle(
            fontSize: 11,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ],
    ],
  );

  @override
  Widget build(BuildContext context) {
    final stop = entry.stop;
    final colors = Theme.of(context).colorScheme;
    final current = entry.stage == StopStage.current;
    final predicted =
        stop.actualArrival == null && entry.stage != StopStage.passed
        ? entry.prediction?.predictedArrival
        : null;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          width: 54,
          child: Padding(
            padding: const EdgeInsets.only(top: 12, right: 4),
            child: _time(
              context,
              'Arrival',
              stop.scheduledArrival,
              stop.actualArrival ?? predicted,
              predicted: predicted != null,
            ),
          ),
        ),
        SizedBox(
          width: 30,
          child: CustomPaint(painter: _RailPainter(colors.outlineVariant)),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12, right: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stop.station?.name ?? 'Station unavailable',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: current ? colors.primary : colors.onSurface,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  [
                    stop.station?.code,
                    if (stop.platform?.isNotEmpty == true)
                      'PF ${stop.platform}',
                  ].whereType<String>().join(' · '),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
                if (current)
                  Text(
                    stop.hasDeparted
                        ? 'Last reported departure'
                        : 'Last reported station',
                    style: TextStyle(fontSize: 10, color: colors.primary),
                  ),
                if (stop.station != null)
                  IconButton(
                    tooltip: 'Directions to ${stop.station!.name}',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.directions_outlined, size: 18),
                    onPressed: () async {
                      final url = Uri.https('www.google.com', '/maps/dir/', {
                        'api': '1',
                        'destination':
                            '${stop.station!.label} railway station India',
                      });
                      try {
                        if (!await launchUrl(
                          url,
                          mode: LaunchMode.externalApplication,
                        )) {
                          throw StateError('Unavailable');
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
              ],
            ),
          ),
        ),
        SizedBox(
          width: 54,
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: _time(
              context,
              'Departs',
              stop.scheduledDeparture,
              stop.actualDeparture,
            ),
          ),
        ),
      ],
    );
  }
}

class _RailPainter extends CustomPainter {
  final Color color;
  _RailPainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2;
    canvas.drawLine(const Offset(9, 0), Offset(9, size.height), paint);
    canvas.drawLine(const Offset(21, 0), Offset(21, size.height), paint);
    for (double y = 0; y < size.height; y += 12) {
      canvas.drawLine(Offset(5, y), Offset(25, y), paint);
    }
    canvas.drawCircle(const Offset(15, 15), 4, Paint()..color = Colors.blue);
  }

  @override
  bool shouldRepaint(_RailPainter oldDelegate) => oldDelegate.color != color;
}
