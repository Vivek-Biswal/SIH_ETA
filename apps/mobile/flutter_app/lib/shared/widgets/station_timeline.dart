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
  final Set<int> _expandedGaps = {};

  @override
  void didUpdateWidget(StationTimeline oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A new route must not inherit expansion state from unrelated sections.
    final before = oldWidget.stops
        .map((s) => '${s.stop.station?.code}:${isPassingEntry(s)}')
        .join('|');
    final after = widget.stops
        .map((s) => '${s.stop.station?.code}:${isPassingEntry(s)}')
        .join('|');
    if (before != after) _expandedGaps.clear();
  }

  @override
  Widget build(BuildContext context) {
    final stops = widget.stops;
    final anchors = <int>[
      for (var i = 0; i < stops.length; i++)
        if (i == 0 || i == stops.length - 1 || !isPassingEntry(stops[i])) i,
    ];
    final scale = MediaQuery.textScalerOf(context).scale(1);
    final height = 190.0 * scale;
    final gapHeight = 64.0 * scale;
    final rows = <Widget>[];
    double offset = 0;
    double? markerTop;
    String? markerCode;

    void addStation(int i, {VoidCallback? onGapTap}) {
      if (stops[i].stage == StopStage.current) {
        markerTop = offset + 14;
        markerCode = stops[i].stop.station?.code;
      }
      rows.add(
        SizedBox(
          height: height,
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: onGapTap,
            child: _StopTile(entry: stops[i], last: i == stops.length - 1),
          ),
        ),
      );
      offset += height;
    }

    for (var a = 0; a < anchors.length; a++) {
      final start = anchors[a];
      final end = a + 1 < anchors.length ? anchors[a + 1] : start;
      final count = end - start - 1;
      void toggle() => setState(() {
        if (!_expandedGaps.remove(start)) _expandedGaps.add(start);
      });
      addStation(start, onGapTap: count > 0 ? toggle : null);
      if (count <= 0) continue;
      final expanded = _expandedGaps.contains(start);
      final from = stops[start].stop.station?.name ?? 'station';
      final to = stops[end].stop.station?.name ?? 'next station';
      rows.add(
        SizedBox(
          height: gapHeight,
          child: Semantics(
            button: true,
            label:
                '${expanded ? "Hide" : "Show"} $count intermediate stations between $from and $to',
            child: InkWell(
              key: ValueKey('station-gap-$start-$end'),
              onTap: toggle,
              borderRadius: BorderRadius.circular(12),
              child: Row(
                children: [
                  const SizedBox(width: 54),
                  SizedBox(
                    width: 30,
                    height: gapHeight,
                    child: CustomPaint(
                      painter: _RailPainter(
                        Theme.of(context).colorScheme.outlineVariant,
                        dot: false,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${expanded ? "Hide" : "Show"} $count intermediate stations',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  Icon(
                    expanded ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      offset += gapHeight;
      for (var i = start + 1; i < end; i++) {
        if (expanded || stops[i].stage == StopStage.current) addStation(i);
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Stack(
          children: [
            Column(children: rows),
            if (markerTop != null)
              AnimatedPositioned(
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeInOut,
                left: 54,
                top: markerTop,
                child: IgnorePointer(
                  child: Tooltip(
                    message: 'Last reported station',
                    child: CircleAvatar(
                      key: ValueKey('train-marker-$markerCode'),
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
              ),
          ],
        ),
        Text(
          'Tap a gap to show its intermediate stations. The train marks the last reported station.',
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
  final bool dot;
  _RailPainter(this.color, {this.dot = true});
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
    if (dot) {
      canvas.drawCircle(const Offset(15, 15), 4, Paint()..color = Colors.blue);
    }
  }

  @override
  bool shouldRepaint(_RailPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.dot != dot;
}
