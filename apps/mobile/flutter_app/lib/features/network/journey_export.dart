import 'dart:convert';

/// Restricts the web bridge to small, named journey CSV exports.
({String filename, String csv}) parseJourneyExport(String message) {
  if (message.length > 2000000) throw const FormatException('Export too large');
  final value = jsonDecode(message);
  if (value is! Map<String, dynamic> ||
      value['filename'] is! String ||
      value['csv'] is! String) {
    throw const FormatException('Invalid export');
  }
  final filename = value['filename'] as String;
  final csv = value['csv'] as String;
  if (!RegExp(r'^journey-\d{5}-\d{4}-\d{2}-\d{2}\.csv$').hasMatch(filename) ||
      csv.isEmpty) {
    throw const FormatException('Invalid journey file');
  }
  return (filename: filename, csv: csv);
}
