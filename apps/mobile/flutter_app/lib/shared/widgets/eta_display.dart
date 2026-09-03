import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'status_badge.dart';

class EtaDisplay extends StatelessWidget {
  final String scheduledTime;
  final String predictedTime;
  final int delayMinutes;
  final double confidence;

  const EtaDisplay({
    super.key,
    required this.scheduledTime,
    required this.predictedTime,
    required this.delayMinutes,
    required this.confidence,
  });

  @override
  Widget build(BuildContext context) {
    final bool isDelayed = delayMinutes > 0;
    final StatusType statusType = delayMinutes >= 15
        ? StatusType.critical
        : (delayMinutes > 0 ? StatusType.warning : StatusType.onTime);

    final Color delayColor = delayMinutes >= 15
        ? AppColors.criticalRed
        : (delayMinutes > 0 ? AppColors.warningAmber : AppColors.liveGreen);

    return Container(
      padding: const EdgeInsets.all(20),
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
              Text(
                'PREDICTED ARRIVAL (ETA)',
                style: AppTypography.labelSmall,
              ),
              StatusBadge(
                label: isDelayed ? '+$delayMinutes MIN DELAY' : 'ON TIME',
                type: statusType,
                showPulse: true,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                predictedTime,
                style: AppTypography.dataHero.copyWith(
                  color: isDelayed ? delayColor : AppColors.pureWhite,
                ),
              ),
              if (isDelayed) ...[
                const SizedBox(width: 14),
                Text(
                  scheduledTime,
                  style: AppTypography.dataLarge.copyWith(
                    color: AppColors.mutedSteel,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          Divider(color: AppColors.whisperBorder, height: 1),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'MODEL CONFIDENCE',
                style: AppTypography.labelSmall,
              ),
              Text(
                '${(confidence * 100).toInt()}% HIGH',
                style: AppTypography.dataSmall.copyWith(
                  color: AppColors.brandBlue,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: confidence,
              backgroundColor: AppColors.whisperBorder,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.brandBlue),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}
