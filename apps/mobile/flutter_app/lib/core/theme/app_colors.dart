import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Neutrals (Structure & Typography)
  static const Color canvasBlack = Color(0xFF09090B);
  static const Color surfaceZinc = Color(0xFF18181B);
  static const Color surfaceZincLight = Color(0xFF27272A);
  static const Color whisperBorder = Color(0x1AFFFFFF); // rgba(255, 255, 255, 0.1)
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color mutedSteel = Color(0xFFA1A1AA);

  // Semantic Accents (Status & Alerts)
  static const Color liveGreen = Color(0xFF22C55E);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color criticalRed = Color(0xFFEF4444);
  static const Color brandBlue = Color(0xFF3B82F6);

  // Opacities / Helpers
  static Color liveGreenBg = liveGreen.withValues(alpha: 0.15);
  static Color warningAmberBg = warningAmber.withValues(alpha: 0.15);
  static Color criticalRedBg = criticalRed.withValues(alpha: 0.15);
  static Color brandBlueBg = brandBlue.withValues(alpha: 0.15);
}
