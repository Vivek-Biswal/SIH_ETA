import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.brandBlue,
        brightness: Brightness.dark,
        primary: AppColors.brandBlue,
        surface: AppColors.surfaceZinc,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.canvasBlack,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 16,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          foregroundColor: AppColors.pureWhite,
          backgroundColor: const Color(0xFF2563EB),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          foregroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      scaffoldBackgroundColor: AppColors.canvasBlack,
      primaryColor: AppColors.brandBlue,
      canvasColor: AppColors.canvasBlack,
      cardColor: AppColors.surfaceZinc,
      dividerColor: AppColors.whisperBorder,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.canvasBlack,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.pureWhite),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.canvasBlack,
        selectedItemColor: AppColors.brandBlue,
        unselectedItemColor: AppColors.mutedSteel,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }
}
