import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/saved_journeys.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/features/train_details/train_details_screen.dart';
import 'fixtures.dart';

class RefreshRepository implements TrainRepository {
  final calls = <({String number, String? date})>[];
  Future<JourneyResult> Function(String, String?)? respond;

  JourneyResult result(String number, String? date) {
    final resolved = date ?? '2026-09-20';
    return JourneyResult(
      ApiResult.success(
        TrainStatus.fromJson(statusJson(number: number, date: resolved)),
      ),
      ApiResult.success(
        ETAModel.fromJson(etaJson(date: resolved)..['train_number'] = number),
      ),
      DateTime.utc(2026, 9, 20, 5, calls.length),
    );
  }

  @override
  Future<JourneyResult> getJourney(String trainNumber, {String? date}) async {
    calls.add((number: trainNumber, date: date));
    return respond == null
        ? result(trainNumber, date)
        : respond!(trainNumber, date);
  }

  @override
  Future<ApiResult<List<Station>>> searchStations(String query) async =>
      ApiResult.success([]);

  @override
  Future<ApiResult<TrainSearchPage>> searchTrains(
    String from,
    String to, {
    int page = 1,
    DateTime? date,
  }) async => ApiResult.success(TrainSearchPage.fromJson(searchJson()));
}

Future<void> details(
  WidgetTester tester,
  RefreshRepository repo, {
  String number = '12301',
  String? date,
  String? station,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [trainRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp(
        home: TrainDetailsScreen(
          trainNumber: number,
          journeyDate: date,
          stationCode: station,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('train and date changes reset the journey and arrival station', (
    tester,
  ) async {
    final repo = RefreshRepository();
    await details(tester, repo, date: '2026-09-20', station: 'CCC');
    expect(repo.calls.last, (number: '12301', date: '2026-09-20'));
    expect(
      tester
          .widget<DropdownButtonFormField<int>>(
            find.byKey(const Key('arrival-station')),
          )
          .initialValue,
      2,
    );

    await details(
      tester,
      repo,
      number: '54321',
      date: '2026-09-21',
      station: 'BBB',
    );
    expect(repo.calls.last, (number: '54321', date: '2026-09-21'));
    expect(
      tester
          .widget<DropdownButtonFormField<int>>(
            find.byKey(const Key('arrival-station')),
          )
          .initialValue,
      1,
    );
    expect(find.text('Journey: 2026-09-21'), findsOneWidget);

    await details(
      tester,
      repo,
      number: '54321',
      date: '2026-09-22',
      station: 'CCC',
    );
    expect(repo.calls.last, (number: '54321', date: '2026-09-22'));
    expect(
      tester
          .widget<DropdownButtonFormField<int>>(
            find.byKey(const Key('arrival-station')),
          )
          .initialValue,
      2,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'changing only the tracked station updates selection without refetching',
    (tester) async {
      final repo = RefreshRepository();
      await details(tester, repo, station: 'CCC');
      await details(tester, repo, station: 'BBB');
      expect(repo.calls, hasLength(1));
      expect(
        tester
            .widget<DropdownButtonFormField<int>>(
              find.byKey(const Key('arrival-station')),
            )
            .initialValue,
        1,
      );
    },
  );

  testWidgets('superseded train responses cannot overwrite the new journey', (
    tester,
  ) async {
    final repo = RefreshRepository();
    final oldRequest = Completer<JourneyResult>();
    repo.respond = (number, date) => number == '12301'
        ? oldRequest.future
        : Future.value(repo.result(number, date));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [trainRepositoryProvider.overrideWithValue(repo)],
        child: const MaterialApp(
          home: TrainDetailsScreen(trainNumber: '12301'),
        ),
      ),
    );
    await tester.pump();
    await details(tester, repo, number: '54321', date: '2026-09-21');
    oldRequest.complete(repo.result('12301', '2026-09-20'));
    await tester.pumpAndSettle();
    expect(find.text('Train 54321'), findsOneWidget);
    expect(find.text('Journey: 2026-09-21'), findsOneWidget);
    expect(find.text('Journey: 2026-09-20'), findsNothing);
  });

  testWidgets('an unavailable requested station is explained', (tester) async {
    final repo = RefreshRepository();
    await details(tester, repo, station: 'ZZZ');
    expect(
      find.textContaining('ZZZ could not be uniquely matched'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('arrival-station')), findsOneWidget);
  });

  testWidgets(
    'polling pins the resolved journey and skips background or covered pages',
    (tester) async {
      final repo = RefreshRepository();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await details(tester, repo);
      expect(repo.calls.single.date, isNull);
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(repo.calls.last.date, '2026-09-20');
      expect(repo.calls, hasLength(2));

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(const Duration(seconds: 30));
      expect(repo.calls, hasLength(2));

      final context = tester.element(find.byType(TrainDetailsScreen));
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const Scaffold(body: Text('Covered page')),
        ),
      );
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump(const Duration(seconds: 30));
      expect(repo.calls, hasLength(2));
      Navigator.of(context).pop();
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(repo.calls, hasLength(3));
      expect(find.textContaining('every 30 seconds'), findsOneWidget);
    },
  );

  testWidgets('partial refresh keeps separate status and arrival fetch times', (
    tester,
  ) async {
    final repo = RefreshRepository();
    await details(tester, repo);
    final originalStatusTime = tester
        .widget<Text>(find.textContaining('Status fetched:'))
        .data;
    final originalEtaTime = tester
        .widget<Text>(find.textContaining('Arrival information fetched:'))
        .data;
    repo.respond = (number, date) async => JourneyResult(
      ApiResult.error('Status connection failed'),
      repo.result(number, date).eta,
      DateTime.utc(2026, 9, 20, 6),
    );
    await tester.tap(find.byKey(const Key('refresh-journey')));
    await tester.pumpAndSettle();
    expect(
      tester.widget<Text>(find.textContaining('Status fetched:')).data,
      originalStatusTime,
    );
    expect(
      tester
          .widget<Text>(find.textContaining('Arrival information fetched:'))
          .data,
      isNot(originalEtaTime),
    );
    expect(find.textContaining('Showing last fetched status'), findsOneWidget);
  });

  testWidgets('save journey keeps the returned date and selected station', (
    tester,
  ) async {
    final repo = RefreshRepository();
    await details(tester, repo, station: 'BBB');
    await tester.ensureVisible(find.byKey(const Key('save-journey')));
    await tester.tap(find.byKey(const Key('save-journey')));
    await tester.pumpAndSettle();
    final container = ProviderScope.containerOf(
      tester.element(find.byType(TrainDetailsScreen)),
    );
    final saved = container.read(savedJourneysProvider).single;
    expect(saved.trainNumber, '12301');
    expect(saved.journeyDate, '2026-09-20');
    expect(saved.stationCode, 'BBB');
    expect(find.text('Journey saved'), findsOneWidget);
    await tester.tap(find.byKey(const Key('save-journey')));
    await tester.pumpAndSettle();
    expect(container.read(savedJourneysProvider), isEmpty);
  });
}
