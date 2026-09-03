import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  // Headings & UI (Fallback to clean sans if geist not packaged)
  static TextStyle headlineLarge = GoogleFonts.interTight(
    fontSize: 28,
    fontWeight: FontWeight.w600,
    color: AppColors.pureWhite,
    letterSpacing: -0.5,
  );

  static TextStyle headlineMedium = GoogleFonts.interTight(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.pureWhite,
    letterSpacing: -0.3,
  );

  static TextStyle headlineSmall = GoogleFonts.interTight(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.pureWhite,
    letterSpacing: -0.2,
  );

  static TextStyle bodyLarge = GoogleFonts.interTight(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: AppColors.pureWhite,
  );

  static TextStyle bodyMedium = GoogleFonts.interTight(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: AppColors.mutedSteel,
  );

  static TextStyle labelSmall = GoogleFonts.interTight(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.mutedSteel,
    letterSpacing: 0.5,
  );

  // Tabular / Monospace (JetBrains Mono)
  static TextStyle dataHero = GoogleFonts.jetBrainsMono(
    fontSize: 36,
    fontWeight: FontWeight.w700,
    color: AppColors.pureWhite,
    letterSpacing: -1.0,
  );

  static TextStyle dataLarge = GoogleFonts.jetBrainsMono(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: AppColors.pureWhite,
  );

  static TextStyle dataMedium = GoogleFonts.jetBrainsMono(
    fontSize: 15,
    fontWeight: FontWeight.w500,
    color: AppColors.pureWhite,
  );

  static TextStyle dataSmall = GoogleFonts.jetBrainsMono(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.mutedSteel,
  );
}
