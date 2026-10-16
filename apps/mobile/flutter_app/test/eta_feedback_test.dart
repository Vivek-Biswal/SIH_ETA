import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/eta_feedback.dart';
import 'package:sih_eta/shared/widgets/eta_feedback.dart';

void main() {
  Future<EtaFeedbackRepository> repository(
    Future<http.Response> Function(http.Request) handler,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final repo = EtaFeedbackRepository(
      prefs,
      client: ApiClient(client: MockClient(handler)),
      endpoint: 'https://example.test/feedback',
    );
    addTearDown(repo.close);
    return repo;
  }

  const payload = {
    'train_number': '12423',
    'journey_date': '2026-10-15',
    'station_code': 'NDLS',
    'rating': 'unavailable',
  };

  test(
    'offline feedback survives repository recreation and retries use one report id',
    () async {
      final requests = <String>[];
      var online = false;
      final repo = await repository((request) async {
        final data = jsonDecode(request.body) as Map;
        requests.add(data['report_id'] as String);
        return online
            ? http.Response(
                jsonEncode({
                  'report_id': data['report_id'],
                  'status': 'received',
                }),
                201,
              )
            : http.Response('Unavailable', 503);
      });
      final saved = await repo.submit('journey', payload);
      expect(saved.sent, false);
      final restored = EtaFeedbackRepository(
        repo.preferences,
        client: repo.client,
      );
      expect(restored.latest('journey')!.id, saved.id);
      online = true;
      final sent = await restored.send(restored.latest('journey')!);
      expect(sent.sent, true);
      expect(requests, [saved.id, saved.id]);
      expect(restored.reports, hasLength(1));
      expect(restored.latest('journey')!.sent, true);
    },
  );

  test(
    'a mismatched server receipt never claims a report was received',
    () async {
      final repo = await repository(
        (_) async =>
            http.Response('{"report_id":"wrong","status":"received"}', 201),
      );
      expect((await repo.submit('journey', payload)).sent, false);
    },
  );

  test(
    'unavailable device storage does not lose a report in a network-only submission',
    () async {
      var calls = 0;
      final repo = EtaFeedbackRepository(
        null,
        client: ApiClient(
          client: MockClient((_) async {
            calls++;
            return http.Response('{}', 200);
          }),
        ),
      );
      addTearDown(repo.close);
      await expectLater(repo.submit('journey', payload), throwsStateError);
      expect(calls, 0);
    },
  );

  testWidgets(
    'missing ETA can be reported and an offline copy has an explicit retry',
    (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final repo = await repository(
        (_) async => http.Response('Unavailable', 503),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [etaFeedbackRepositoryProvider.overrideWithValue(repo)],
          child: const MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: EtaFeedbackCard(
                  trainNumber: '12423',
                  date: '2026-10-15',
                  stationCode: 'NDLS',
                  stationName: 'New Delhi',
                ),
              ),
            ),
          ),
        ),
      );
      expect(find.text('Accurate'), findsNothing);
      await tester.tap(find.text('ETA unavailable'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('send-eta-feedback')));
      await tester.tap(find.byKey(const Key('send-eta-feedback')));
      await tester.pumpAndSettle();
      expect(find.text('Saved on this device · not sent yet'), findsOneWidget);
      expect(find.text('Send saved feedback'), findsOneWidget);
      expect(repo.reports.single.payload['rating'], 'unavailable');
      expect(tester.takeException(), isNull);
    },
  );
}
