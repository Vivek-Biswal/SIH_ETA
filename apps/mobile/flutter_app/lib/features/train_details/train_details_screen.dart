import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/services/train_repository.dart';
import '../../shared/widgets/eta_display.dart';
import '../../shared/widgets/station_timeline.dart';

class TrainDetailsScreen extends ConsumerWidget {
  final String trainNumber;

  const TrainDetailsScreen({super.key, required this.trainNumber});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final etaAsync = ref.watch(trainEtaProvider(trainNumber));

    return Scaffold(
      backgroundColor: AppColors.canvasBlack,
      appBar: AppBar(
        title: Text(trainNumber, style: AppTypography.dataLarge),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: etaAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.brandBlue),
        ),
        error: (err, _) => Center(
          child: Text('Failed to load ETA telemetry: $err', style: AppTypography.bodyMedium),
        ),
        data: (eta) {
          final stops = eta.remainingStations.map((s) {
            return StationStop(
              stationCode: s.station.code,
              stationName: s.station.name,
              scheduledTime: s.scheduledArrival,
              predictedTime: s.predictedArrival,
              delayMinutes: s.predictedDelayMinutes,
              platform: s.platform,
              isCurrent: s.station.code == 'CNB',
            );
          }).toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eta.trainName.toUpperCase(),
                  style: AppTypography.headlineMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'MODEL VERSION: ${eta.modelVersion} [ML PREDICTION]',
                  style: AppTypography.labelSmall.copyWith(color: AppColors.brandBlue),
                ),
                const SizedBox(height: 16),

                // Hero ETA Display
                EtaDisplay(
                  scheduledTime: '19:55',
                  predictedTime: '20:47',
                  delayMinutes: eta.overallDelayMinutes,
                  confidence: eta.confidenceScore,
                ),

                const SizedBox(height: 24),
                Text(
                  'ATTRIBUTION FACTORS (WHY THE DELAY?)',
                  style: AppTypography.labelSmall,
                ),
                const SizedBox(height: 12),

                ...eta.delayFactors.map((df) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceZinc,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppColors.whisperBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(df.factor, style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                            Text(df.description, style: AppTypography.bodyMedium),
                          ],
                        ),
                      ),
                      Text(
                        '+${df.contributionMinutes}M',
                        style: AppTypography.dataMedium.copyWith(
                          color: AppColors.criticalRed,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                )),

                const SizedBox(height: 24),
                Text(
                  'STATION-BY-STATION PREDICTED TIMELINE',
                  style: AppTypography.labelSmall,
                ),
                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceZinc,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.whisperBorder),
                  ),
                  child: StationTimeline(stops: stops),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
