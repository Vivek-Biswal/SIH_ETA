import 'package:flutter/material.dart';

class AppTypography {
  AppTypography._();

  // Headings & UI (Fallback to clean sans if geist not packaged)
  static TextStyle headlineLarge = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 28,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
  );

  static TextStyle headlineMedium = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
  );

  static TextStyle headlineSmall = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
  );

  static TextStyle bodyLarge = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 15,
    fontWeight: FontWeight.w400,
  );

  static TextStyle bodyMedium = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 13,
    fontWeight: FontWeight.w400,
  );

  static TextStyle labelSmall = const TextStyle(
    fontFamily: 'Roboto',
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
  );

  // Tabular / Monospace (JetBrains Mono)
  static TextStyle dataHero = const TextStyle(
    fontFamily: 'monospace',
    fontSize: 36,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.0,
  );

  static TextStyle dataLarge = const TextStyle(
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: FontWeight.w600,
  );

  static TextStyle dataMedium = const TextStyle(
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: FontWeight.w500,
  );

  static TextStyle dataSmall = const TextStyle(
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: FontWeight.w400,
  );
}
