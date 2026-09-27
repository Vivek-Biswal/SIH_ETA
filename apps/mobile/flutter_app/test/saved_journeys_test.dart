import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/services/saved_journeys.dart';
import 'package:sih_eta/core/services/onboarding_preferences.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/main.dart';
import 'package:sih_eta/features/train_details/train_details_screen.dart';
import 'fixtures.dart';
import 'passenger_flow_test.dart' show TestRepository, revealTap, phone;

class DatedRepository extends TestRepository {
  String? requestedDate;
  @override
  Future<JourneyResult> getJourney(String trainNumber, {String? date}) async {
    requestedDate = date;
    return JourneyResult(
      ApiResult.success(TrainStatus.fromJson(statusJson(date: date))),
      ApiResult.success(ETAModel.fromJson(etaJson(date: date))),
      DateTime.now(),
    );
  }
}

void main() {
  const journey = SavedJourney(
    trainNumber: '12301',
    trainName: 'Test Express',
    journeyDate: '2026-09-20',
    stationCode: 'CCC',
    stationName: 'CCC station',
  );

  test(
    'saved journeys survive restart, deduplicate and remove only selected run',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(
        overrides: [preferencesProvider.overrideWithValue(prefs)],
      );
      final saved = container.read(savedJourneysProvider.notifier);
      await Future.wait([
        saved.save(journey),
        saved.save(journey),
        saved.save(
          const SavedJourney(
            trainNumber: '12301',
            trainName: 'Test Express',
            journeyDate: '2026-09-21',
          ),
        ),
      ]);
      expect(container.read(savedJourneysProvider).length, 2);
      container.dispose();
      final restored = ProviderContainer(
        overrides: [preferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(restored.dispose);
      expect(
        restored.read(savedJourneysProvider).last.location,
        '/trains/12301?date=2026-09-20&station=CCC',
      );
      await restored.read(savedJourneysProvider.notifier).remove(journey.id);
      expect(
        restored.read(savedJourneysProvider).single.journeyDate,
        '2026-09-21',
      );
    },
  );

  test('damaged saved record does not hide valid records', () async {
    SharedPreferences.setMockInitialValues({
      SavedJourneys.storageKey: [
        'broken',
        jsonEncode(journey.toJson()),
        jsonEncode({...journey.toJson(), 'journeyDate': '2026-02-31'}),
      ],
    });
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [preferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(container.dispose);
    expect(container.read(savedJourneysProvider).single.id, journey.id);
  });

  testWidgets(
    'first launch shows guide, persists skip, replays from Help and survives restart',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      var router = createAppRouter();
      Future<void> launch() => tester.pumpWidget(
        ProviderScope(
          overrides: [preferencesProvider.overrideWithValue(prefs)],
          child: SihEtaMobileApp(router: router),
        ),
      );
      await launch();
      await tester.pumpAndSettle();
      expect(find.text('Welcome to SIH ETA'), findsOneWidget);
      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('train-number')), findsOneWidget);
      expect(prefs.getBool(OnboardingPreferences.completedKey), true);
      await tester.tap(find.text('Help'));
      await tester.pumpAndSettle();
      await revealTap(tester, find.byKey(const Key('replay-guide')));
      expect(find.text('Your travel guide'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      expect(find.text('Help & settings'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      router.dispose();
      router = createAppRouter();
      await launch();
      await tester.pumpAndSettle();
      expect(find.text('Welcome to SIH ETA'), findsNothing);
      expect(find.byKey(const Key('train-number')), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      router.dispose();
    },
  );

  testWidgets(
    'saved tab opens exact date and station and supports remove and undo',
    (tester) async {
      phone(tester, scale: 1.4);
      SharedPreferences.setMockInitialValues({
        OnboardingPreferences.completedKey: true,
        SavedJourneys.storageKey: [jsonEncode(journey.toJson())],
      });
      final prefs = await SharedPreferences.getInstance();
      final repo = DatedRepository();
      final router = createAppRouter(initialLocation: '/saved');
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferencesProvider.overrideWithValue(prefs),
            trainRepositoryProvider.overrideWithValue(repo),
          ],
          child: SihEtaMobileApp(router: router),
        ),
      );
      await tester.pumpAndSettle();
      await revealTap(tester, find.byKey(Key('open-saved-${journey.id}')));
      expect(repo.requestedDate, journey.journeyDate);
      expect(
        tester
            .widget<TrainDetailsScreen>(find.byType(TrainDetailsScreen))
            .stationCode,
        'CCC',
      );
      await tester.tap(find.byTooltip('Back to search'));
      await tester.pumpAndSettle();
      await revealTap(tester, find.byKey(Key('remove-saved-${journey.id}')));
      expect(find.text('Keep your train handy'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(find.text('Test Express'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('search result retains chosen start date and destination', (
    tester,
  ) async {
    final repo = DatedRepository();
    final router = createAppRouter(
      initialLocation: '/search?from=AAA&to=CCC&date=2026-09-20',
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [trainRepositoryProvider.overrideWithValue(repo)],
        child: SihEtaMobileApp(router: router, enableOnboarding: false),
      ),
    );
    await tester.pumpAndSettle();
    await revealTap(tester, find.text('Test Express'));
    expect(repo.requestedDate, '2026-09-20');
    expect(
      tester
          .widget<TrainDetailsScreen>(find.byType(TrainDetailsScreen))
          .stationCode,
      'CCC',
    );
    expect(tester.takeException(), isNull);
  });
}
