import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/core/theme/app_theme.dart';
import 'package:sih_eta/shared/widgets/eta_display.dart';
import 'package:sih_eta/main.dart';
import 'fixtures.dart';
import 'passenger_flow_test.dart' show TestRepository;

void main() {
  test('demonstration records are rejected before parsing', () async {
    final client = ApiClient(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'data_source': 'demo', 'delay': 15}),
          200,
        ),
      ),
    );
    addTearDown(client.close);
    var parsed = false;
    final result = await client.get('https://example.test', (json) {
      parsed = true;
      return json;
    });
    expect(result.status, ApiResultStatus.unavailable);
    expect(result.data, isNull);
    expect(parsed, false);
  });
  test(
    'arrival differences respect dates and never guess overnight schedules',
    () {
      expect(arrivalDifference('23:50', '00:10'), isNull);
      expect(
        arrivalDifference(
          '2026-09-20T23:50:00+05:30',
          '2026-09-21T00:10:00+05:30',
        ),
        20,
      );
      expect(
        arrivalDifference('2026-09-20T23:50:00', '2026-09-21T00:10:00Z'),
        isNull,
      );
    },
  );
  test('explicit journey date is sent to both API endpoints', () async {
    final uris = <Uri>[];
    final client = ApiClient(
      client: MockClient((request) async {
        uris.add(request.url);
        return http.Response(
          jsonEncode(
            request.url.path.endsWith('/status')
                ? statusJson(date: '2026-09-19')
                : etaJson(date: '2026-09-19'),
          ),
          200,
        );
      }),
    );
    final repo = ApiTrainRepository(
      client: client,
      baseUrl: 'https://example.test/api/v1',
    );
    addTearDown(repo.close);
    await repo.getJourney('12301', date: '2026-09-19');
    expect(
      uris.every((u) => u.queryParameters['date'] == '2026-09-19'),
      isTrue,
    );
  });
  test('appearance and real user history persist and clear', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [preferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(container.dispose);
    await container.read(appearanceProvider.notifier).setMode(ThemeMode.light);
    await container.read(historyProvider.notifier).add('12301');
    await container.read(historyProvider.notifier).add('12301');
    expect(prefs.getString('appearance'), 'light');
    expect(container.read(historyProvider), ['12301']);
    await container.read(historyProvider.notifier).clear();
    expect(prefs.getStringList('train_history'), isNull);
  });
  for (final dark in [false, true]) {
    testWidgets(
      'ETA explanation is readable in ${dark ? "dark" : "light"} mode',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
            home: const Scaffold(
              body: SingleChildScrollView(
                child: EtaDisplay(
                  destination: 'Destination',
                  scheduledTime: '10:00',
                  delayMinutes: 15,
                  method: 'Schedule only',
                ),
              ),
            ),
          ),
        );
        expect(find.text('Unavailable'), findsOneWidget);
        expect(find.text('Arrival difference unavailable'), findsOneWidget);
        await tester.tap(find.text('Why this ETA?'));
        await tester.pumpAndSettle();
        expect(find.textContaining('No verified cause'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
    testWidgets('home ${dark ? "dark" : "light"} phone layout', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final router = createAppRouter();
      addTearDown(router.dispose);
      SharedPreferences.setMockInitialValues({
        'appearance': dark ? 'dark' : 'light',
      });
      final prefs = await SharedPreferences.getInstance();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferencesProvider.overrideWithValue(prefs),
            trainRepositoryProvider.overrideWithValue(TestRepository()),
          ],
          child: RepaintBoundary(
            key: const Key('preview'),
            child: SihEtaMobileApp(router: router),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Find your train'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await expectLater(
        find.byKey(const Key('preview')),
        matchesGoldenFile('goldens/home_${dark ? "dark" : "light"}.png'),
      );
    });
  }
}
