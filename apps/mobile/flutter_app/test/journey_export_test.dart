import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/features/network/journey_export.dart';

void main() {
  test('preserves Unicode CSV and its journey filename', () {
    final result = parseJourneyExport(
      jsonEncode({
        'filename': 'journey-12423-2026-09-29.csv',
        'csv': '\uFEFFStation,Delay\nDelhi,5',
      }),
    );
    expect(result.filename, 'journey-12423-2026-09-29.csv');
    expect(result.csv, startsWith('\uFEFFStation'));
  });
  test('rejects malformed, empty, oversized and path-like exports', () {
    for (final message in [
      '{}',
      'bad JSON',
      jsonEncode({'filename': '../export.csv', 'csv': 'data'}),
      jsonEncode({'filename': 'journey-12423-2026-09-29.csv', 'csv': ''}),
      'x' * 2000001,
    ]) {
      expect(() => parseJourneyExport(message), throwsFormatException);
    }
  });
}
