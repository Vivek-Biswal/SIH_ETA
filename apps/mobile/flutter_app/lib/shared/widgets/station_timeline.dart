import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

class StationStop {
  final String stationCode;
  final String stationName;
  final String scheduledTime;
  final String? predictedTime;
  final int? delayMinutes;
  final bool isDeparted;
  final bool isCurrent;
  final String platform;

  const StationStop({
    required this.stationCode,
    required this.stationName,
    required this.scheduledTime,
    this.predictedTime,
    this.delayMinutes,
    this.isDeparted = false,
    this.isCurrent = false,
    required this.platform,
  });
}

class StationTimeline extends StatelessWidget {
  final List<StationStop> stops;

  const StationTimeline({
    super.key,
    required this.stops,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: stops.length,
      itemBuilder: (context, index) {
        final stop = stops[index];
        final isLast = index == stops.length - 1;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left track & node
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    _buildNode(stop),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          color: stop.isDeparted
                              ? AppColors.whisperBorder
                              : ((stop.delayMinutes ?? 0) >= 15
                                  ? AppColors.criticalRed
                                  : ((stop.delayMinutes ?? 0) > 0
                                      ? AppColors.warningAmber
                                      : AppColors.whisperBorder)),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Right content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                stop.stationCode,
                                style: AppTypography.dataMedium.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: stop.isCurrent
                                      ? AppColors.pureWhite
                                      : (stop.isDeparted
                                          ? AppColors.mutedSteel
                                          : AppColors.pureWhite),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                stop.stationName,
                                style: AppTypography.bodyMedium.copyWith(
                                  color: stop.isCurrent
                                      ? AppColors.pureWhite
                                      : AppColors.mutedSteel,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'PF ${stop.platform}',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.mutedSteel,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            stop.predictedTime ?? stop.scheduledTime,
                            style: AppTypography.dataMedium.copyWith(
                              color: (stop.delayMinutes ?? 0) > 0
                                  ? ((stop.delayMinutes ?? 0) >= 15
                                      ? AppColors.criticalRed
                                      : AppColors.warningAmber)
                                  : AppColors.pureWhite,
                            ),
                          ),
                          if ((stop.delayMinutes ?? 0) > 0)
                            Text(
                              stop.scheduledTime,
                              style: AppTypography.dataSmall.copyWith(
                                decoration: TextDecoration.lineThrough,
                                color: AppColors.mutedSteel,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNode(StationStop stop) {
    if (stop.isCurrent) {
      return Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: AppColors.liveGreen,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.pureWhite, width: 2),
        ),
      );
    } else if (stop.isDeparted) {
      return Container(
        width: 10,
        height: 10,
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.mutedSteel.withValues(alpha: 0.4),
          shape: BoxShape.circle,
        ),
      );
    } else {
      return Container(
        width: 10,
        height: 10,
        margin: const EdgeInsets.symmetric(vertical: 2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.mutedSteel, width: 2),
        ),
      );
    }
  }
}
