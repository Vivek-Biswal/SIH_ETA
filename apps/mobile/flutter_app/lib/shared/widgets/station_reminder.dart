import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/journey_view.dart';

class StationReminderButton extends StatelessWidget {
  final String trainNumber;
  final List<JourneyStop> stops;
  const StationReminderButton({
    super.key,
    required this.trainNumber,
    required this.stops,
  });
  @override
  Widget build(BuildContext context) {
    if (kIsWeb ||
        defaultTargetPlatform != TargetPlatform.android ||
        stops.isEmpty) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: OutlinedButton.icon(
        icon: const Icon(Icons.alarm),
        label: const Text('Set a station reminder'),
        onPressed: () async {
          final options = stops
              .where((s) => s.stage != StopStage.passed)
              .toList();
          final stop = await showDialog<JourneyStop>(
            context: context,
            builder: (context) => SimpleDialog(
              title: const Text('Choose reminder station'),
              children: [
                if (options.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('No upcoming stations are available.'),
                  ),
                for (final entry in options)
                  SimpleDialogOption(
                    onPressed: () => Navigator.pop(context, entry),
                    child: Text(
                      entry.stop.station?.label ?? 'Station unavailable',
                    ),
                  ),
              ],
            ),
          );
          if (stop == null || !context.mounted) return;
          final time = await showTimePicker(
            context: context,
            initialTime: TimeOfDay.now(),
            helpText: 'Fixed reminder time · device time zone',
          );
          if (time == null || !context.mounted) return;
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Review in your clock app'),
              content: const Text(
                'This reminder uses the next occurrence of your selected time. It does not track your location or adjust when the ETA changes. Review and save the alarm in your clock app.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Open clock'),
                ),
              ],
            ),
          );
          if (confirmed != true) return;
          try {
            await const MethodChannel('sih_eta/travel').invokeMethod('alarm', {
              'hour': time.hour,
              'minute': time.minute,
              'label':
                  'Train $trainNumber · ${stop.stop.station?.label ?? "Station reminder"}',
            });
          } catch (_) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('No compatible clock app is available.'),
                ),
              );
            }
          }
        },
      ),
    );
  }
}
