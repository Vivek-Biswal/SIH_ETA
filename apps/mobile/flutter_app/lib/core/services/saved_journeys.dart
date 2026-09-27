import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'preferences.dart';

/// A shortcut to a journey, never an offline copy of its arrival estimates.
class SavedJourney {
  final String trainNumber;
  final String trainName;
  final String? journeyDate;
  final String? stationCode;
  final String? stationName;

  const SavedJourney({
    required this.trainNumber,
    required this.trainName,
    this.journeyDate,
    this.stationCode,
    this.stationName,
  });

  String get id => '$trainNumber|${journeyDate ?? ''}|${stationCode ?? ''}';
  String get location => Uri(
    path: '/trains/$trainNumber',
    queryParameters: {
      if (journeyDate != null) 'date': journeyDate!,
      if (stationCode != null) 'station': stationCode!,
    },
  ).toString();

  Map<String, dynamic> toJson() => {
    'trainNumber': trainNumber,
    'trainName': trainName,
    'journeyDate': journeyDate,
    'stationCode': stationCode,
    'stationName': stationName,
  };

  factory SavedJourney.fromJson(Map<String, dynamic> json) {
    final number = json['trainNumber'] as String;
    final name = json['trainName'] as String;
    final date = json['journeyDate'] as String?;
    final station = json['stationCode'] as String?;
    if (!RegExp(r'^\d{5}$').hasMatch(number) ||
        name.trim().isEmpty ||
        (date != null && !isJourneyDate(date)) ||
        (station != null && !RegExp(r'^[A-Z0-9]{1,10}$').hasMatch(station))) {
      throw const FormatException('Invalid saved journey');
    }
    return SavedJourney(
      trainNumber: number,
      trainName: name,
      journeyDate: date,
      stationCode: station,
      stationName: json['stationName'] as String?,
    );
  }
}

bool isJourneyDate(String value) {
  final date = DateTime.tryParse(value);
  return RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value) &&
      date != null &&
      date.toIso8601String().startsWith('${value}T');
}

final savedJourneysProvider =
    NotifierProvider<SavedJourneys, List<SavedJourney>>(SavedJourneys.new);

class SavedJourneys extends Notifier<List<SavedJourney>> {
  static const storageKey = 'saved_journeys_v1';
  static const limit = 20;
  Future<void> _pending = Future.value();

  @override
  List<SavedJourney> build() {
    final records =
        ref.read(preferencesProvider)?.getStringList(storageKey) ?? [];
    final journeys = <SavedJourney>[];
    for (final record in records) {
      try {
        final journey = SavedJourney.fromJson(
          Map<String, dynamic>.from(jsonDecode(record) as Map),
        );
        if (!journeys.any((item) => item.id == journey.id)) {
          journeys.add(journey);
        }
      } catch (_) {
        // One obsolete or damaged entry must not hide other saved journeys.
      }
    }
    return List.unmodifiable(journeys.take(limit));
  }

  Future<void> _update(List<SavedJourney> Function() next) {
    final operation = _pending.then((_) async {
      final journeys = next();
      final prefs = ref.read(preferencesProvider);
      final written = await prefs?.setStringList(
        storageKey,
        journeys.map((item) => jsonEncode(item.toJson())).toList(),
      );
      if (written == false) throw StateError('Could not save journeys');
      state = List.unmodifiable(journeys);
    });
    _pending = operation.catchError((Object _) {});
    return operation;
  }

  Future<void> save(SavedJourney journey) => _update(() {
    // Apply the same validation to newly created and restored records.
    SavedJourney.fromJson(journey.toJson());
    return [
      journey,
      ...state.where((item) => item.id != journey.id),
    ].take(limit).toList();
  });

  Future<void> remove(String id) =>
      _update(() => state.where((item) => item.id != id).toList());
}
