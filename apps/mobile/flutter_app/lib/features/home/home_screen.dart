import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/services/train_repository.dart';
import '../../core/network/api_client.dart';
import '../../shared/widgets/status_badge.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trainsAsync = ref.watch(recentTrainsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvasBlack,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.brandBlue,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'ETA',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.pureWhite,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text('SIH Train Intelligence', style: AppTypography.headlineSmall),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Commuter Quick Search Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceZinc,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.whisperBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FIND YOUR TRAIN',
                    style: AppTypography.labelSmall,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    style: AppTypography.dataMedium,
                    decoration: InputDecoration(
                      hintText: 'Enter 5-digit train number (e.g. 12301)',
                      hintStyle: AppTypography.bodyMedium,
                      prefixIcon: const Icon(Icons.search, color: AppColors.mutedSteel),
                      filled: true,
                      fillColor: AppColors.canvasBlack,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: AppColors.whisperBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: AppColors.whisperBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: AppColors.brandBlue),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    onSubmitted: (val) {
                      if (val.trim().isNotEmpty) {
                        context.push('/trains/$val');
                      }
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            Text(
              'LIVE MONITORED COMMUTER SERVICES',
              style: AppTypography.labelSmall,
            ),
            const SizedBox(height: 12),

            trainsAsync.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(color: AppColors.brandBlue),
                ),
              ),
              error: (err, _) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.criticalRedBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.criticalRed.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.criticalRed),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Failed to connect to ETA intelligence network. Retrying...',
                        style: AppTypography.bodyMedium.copyWith(color: AppColors.criticalRed),
                      ),
                    ),
                  ],
                ),
              ),
              data: (apiResult) {
                if (apiResult.status == ApiResultStatus.error) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.criticalRedBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.criticalRed.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.criticalRed),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            apiResult.errorMessage ?? 'Failed to connect to ETA intelligence network.',
                            style: AppTypography.bodyMedium.copyWith(color: AppColors.criticalRed),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                final trains = apiResult.data ?? [];
                if (trains.isEmpty) {
                  return Center(
                    child: Text('No live trains at the moment.', style: AppTypography.bodyMedium),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: trains.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, idx) {
                    final t = trains[idx];
                  final isDelayed = t.delayMinutes > 0;

                  return InkWell(
                    onTap: () => context.push('/trains/${t.trainNumber}'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceZinc,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.whisperBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    t.trainNumber,
                                    style: AppTypography.dataLarge.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${t.origin} → ${t.destination}',
                                    style: AppTypography.labelSmall,
                                  ),
                                ],
                              ),
                              StatusBadge(
                                label: isDelayed ? '+${t.delayMinutes}M' : 'ON TIME',
                                type: isDelayed
                                    ? (t.delayMinutes >= 15
                                        ? StatusType.critical
                                        : StatusType.warning)
                                    : StatusType.onTime,
                                showPulse: true,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(t.trainName, style: AppTypography.bodyLarge),
                          const SizedBox(height: 12),
                          Divider(color: AppColors.whisperBorder, height: 1),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Next: ${t.nextStation}',
                                style: AppTypography.bodyMedium,
                              ),
                              Text(
                                'ETA ${t.predictedArrival}',
                                style: AppTypography.dataMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: isDelayed ? AppColors.warningAmber : AppColors.pureWhite,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
