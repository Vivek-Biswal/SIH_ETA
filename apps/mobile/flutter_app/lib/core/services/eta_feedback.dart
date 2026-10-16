import 'dart:convert';
import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../network/api_client.dart';
import 'preferences.dart';

class FeedbackReport {
  final String journeyKey;
  final Map<String, dynamic> payload;
  final bool sent;
  const FeedbackReport(this.journeyKey, this.payload, {this.sent = false});
  String get id => payload['report_id'] as String;
  String encode() =>
      jsonEncode({'journey_key': journeyKey, 'payload': payload, 'sent': sent});
}

class EtaFeedbackRepository {
  static const storageKey = 'eta_feedback_v1';
  final SharedPreferences? preferences;
  final ApiClient client;
  final String endpoint;
  Future<void> _pending = Future.value();
  EtaFeedbackRepository(this.preferences, {ApiClient? client, String? endpoint})
    : client = client ?? ApiClient(),
      endpoint = endpoint ?? '${ApiConfig.v1BaseUrl}/passenger/eta-feedback';

  List<FeedbackReport> get reports {
    final records = <FeedbackReport>[];
    for (final raw in preferences?.getStringList(storageKey) ?? <String>[]) {
      try {
        final value = jsonDecode(raw) as Map<String, dynamic>;
        final payload = Map<String, dynamic>.from(value['payload'] as Map);
        if (!RegExp(
          r'^[a-f0-9]{32}$',
        ).hasMatch(payload['report_id'] as String)) {
          continue;
        }
        records.add(
          FeedbackReport(
            value['journey_key'] as String,
            payload,
            sent: value['sent'] == true,
          ),
        );
      } catch (_) {
        /* A damaged record must not hide other reports. */
      }
    }
    return records;
  }

  FeedbackReport? latest(String journeyKey) {
    final matches = reports.where((r) => r.journeyKey == journeyKey);
    return matches.isEmpty ? null : matches.last;
  }

  Future<void> _save(FeedbackReport report) {
    final operation = _pending.then((_) async {
      final next = reports.where((r) => r.id != report.id).toList();
      while (next.length >= 50) {
        final completed = next.indexWhere((r) => r.sent);
        if (completed < 0) {
          throw StateError(
            'Pending feedback storage is full. Send an earlier report first.',
          );
        }
        next.removeAt(completed);
      }
      next.add(report);
      if (await preferences?.setStringList(
            storageKey,
            next.map((r) => r.encode()).toList(),
          ) !=
          true) {
        throw StateError('Could not save feedback on this device.');
      }
    });
    _pending = operation.catchError((Object _) {});
    return operation;
  }

  Future<FeedbackReport> submit(
    String journeyKey,
    Map<String, dynamic> payload,
  ) async {
    final random = Random.secure();
    final id = List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
    final report = FeedbackReport(journeyKey, {...payload, 'report_id': id});
    await _save(
      report,
    ); // Keep the device copy before attempting a network request.
    return send(report);
  }

  Future<FeedbackReport> send(FeedbackReport report) async {
    final result = await client.post(
      endpoint,
      report.payload,
      (json) => Map<String, dynamic>.from(json as Map),
    );
    if (result.data?['status'] != 'received' ||
        result.data?['report_id'] != report.id) {
      return report;
    }
    final delivered = FeedbackReport(
      report.journeyKey,
      report.payload,
      sent: true,
    );
    await _save(delivered);
    return delivered;
  }

  void close() => client.close();
}

final etaFeedbackRepositoryProvider = Provider<EtaFeedbackRepository>((ref) {
  final repository = EtaFeedbackRepository(ref.read(preferencesProvider));
  ref.onDispose(repository.close);
  return repository;
});
