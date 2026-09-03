import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
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
