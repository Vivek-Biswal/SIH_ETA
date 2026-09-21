import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';

String displayTime(String? value) {
  if (value == null || value.trim().isEmpty) return 'Unavailable';
  if (RegExp(r'^\d{2}:\d{2}(:\d{2})?$').hasMatch(value)) {
    return value.substring(0, 5);
  }
  final date = DateTime.tryParse(value);
  if (date == null) return 'Unavailable';
  // Only convert timestamps with an explicit offset. Naive server times
  // remain as supplied; no guessed journey date is attached to HH:mm.
  final zoned = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(value);
  final local = zoned
      ? date.toUtc().add(Duration(hours: 5, minutes: 30))
      : date;
  return '${DateFormat('d MMM, HH:mm').format(local)}${zoned ? ' IST' : ''}';
}

String delayLabel(int? delay) => delay == null
    ? 'Delay unavailable'
    : delay > 0
    ? '$delay min late'
    : delay < 0
    ? '${-delay} min early'
    : 'On time at last report';

class PassengerCard extends StatelessWidget {
  final Widget child;
  const PassengerCard({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      borderRadius: BorderRadius.circular(16),
    ),
    child: child,
  );
}

class MessagePanel extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final IconData icon;
  const MessagePanel({
    super.key,
    required this.message,
    this.onRetry,
    this.icon = Icons.info_outline,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.symmetric(vertical: 8),
    child: PassengerCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppColors.warningAmber, size: 20),
              SizedBox(width: 10),
              Expanded(child: Text(message, style: TextStyle(height: 1.5))),
            ],
          ),
          if (onRetry != null)
            Padding(
              padding: EdgeInsets.only(top: 8),
              child: TextButton.icon(
                onPressed: onRetry,
                icon: Icon(Icons.refresh),
                label: Text('Retry'),
              ),
            ),
        ],
      ),
    ),
  );
}

class DataTag extends StatelessWidget {
  final String label;
  const DataTag(this.label, {super.key});
  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontSize: 12,
      ),
    ),
  );
}

class SectionTitle extends StatelessWidget {
  final String title;
  const SectionTitle(this.title, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(top: 24, bottom: 12),
    child: Text(
      title,
      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
    ),
  );
}
