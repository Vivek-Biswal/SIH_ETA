import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'passenger_components.dart';

class EtaDisplay extends StatelessWidget {
  final String destination;
  final String? scheduledTime;
  final String? predictedTime;
  final String? actualTime;
  final int? delayMinutes;
  final String method;
  const EtaDisplay({
    super.key,
    required this.destination,
    this.scheduledTime,
    this.predictedTime,
    this.actualTime,
    this.delayMinutes,
    required this.method,
  });

  @override
  Widget build(BuildContext context) {
    final actual = actualTime != null && actualTime!.isNotEmpty;
    final predicted = predictedTime != null && predictedTime!.isNotEmpty;
    return PassengerCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            actual ? 'ARRIVED AT DESTINATION' : 'DESTINATION ARRIVAL',
            style: AppTypography.labelSmall,
          ),
          const SizedBox(height: 8),
          Text(destination, style: AppTypography.headlineMedium),
          const SizedBox(height: 18),
          Text(
            displayTime(
              actual
                  ? actualTime
                  : predicted
                  ? predictedTime
                  : scheduledTime,
            ),
            style: AppTypography.dataHero,
          ),
          const SizedBox(height: 4),
          Text(
            actual
                ? 'Actual arrival'
                : predicted
                ? 'Predicted arrival'
                : 'Scheduled arrival',
            style: const TextStyle(color: AppColors.mutedSteel),
          ),
          if (predicted || actual)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Scheduled: ${displayTime(scheduledTime)}'),
            ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              DataTag(delayLabel(delayMinutes)),
              if (!actual) DataTag(method),
            ],
          ),
          if (!actual && !predicted)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'An adjusted arrival prediction is not available.',
                style: TextStyle(color: AppColors.mutedSteel, height: 1.4),
              ),
            ),
        ],
      ),
    );
  }
}
