import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/main.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'fixtures.dart';

class TestRepository implements TrainRepository {
  int calls = 0;
  bool offline = false;
  bool noTrain = false;
  bool etaOnlyFailure = false;
  bool emptySearch = false;
  String? lastNumber;
  String? searchedFrom;
  String? searchedTo;
  DateTime? searchedDate;
  int searchCalls = 0;
  Completer<JourneyResult>? pending;
  @override
  Future<JourneyResult> getJourney(String trainNumber, {String? date}) async {
    calls++;
    lastNumber = trainNumber;
    if (pending != null) return pending!.future;
    if (offline || noTrain) {
      final state = noTrain
          ? ApiResultStatus.notFound
          : ApiResultStatus.offline;
      return JourneyResult(
        ApiResult.error(
          noTrain ? 'Train not found' : 'Cannot reach server',
          status: state,
        ),
        ApiResult.error('Arrival information unavailable', status: state),
        DateTime.now(),
      );
    }
    return JourneyResult(
      ApiResult.success(TrainStatus.fromJson(statusJson())),
      etaOnlyFailure
          ? ApiResult.error('ETA service unavailable')
          : ApiResult.success(ETAModel.fromJson(etaJson())),
      DateTime.now(),
    );
  }

  @override
  Future<ApiResult<List<Station>>> searchStations(String query) async =>
      ApiResult.success([Station.fromJson(station(query.toUpperCase()))]);
  @override
  Future<ApiResult<TrainSearchPage>> searchTrains(
    String from,
    String to, {
    int page = 1,
    DateTime? date,
  }) async {
    searchedFrom = from;
    searchedTo = to;
    searchedDate = date;
    searchCalls++;
    return ApiResult.success(
      TrainSearchPage.fromJson(searchJson(empty: emptySearch)),
    );
  }
}

Future<void> pumpApp(
  WidgetTester tester,
  TestRepository repository, {
  String location = '/',
}) async {
  final router = createAppRouter(initialLocation: location);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [trainRepositoryProvider.overrideWithValue(repository)],
      child: SihEtaMobileApp(router: router),
    ),
  );
  await tester.pumpAndSettle();
}

void phone(WidgetTester tester, {double scale = 1}) {
  tester.view.physicalSize = const Size(320, 800);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> revealTap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'number lookup navigates to real fields with schedule-only labels',
    (tester) async {
      phone(tester);
      final repo = TestRepository();
      await pumpApp(tester, repo);
      await revealTap(tester, find.byKey(const Key('find-train')));
      expect(find.text('Enter a valid 5-digit train number.'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('train-number')), '12301');
      await revealTap(tester, find.byKey(const Key('find-train')));
      expect(repo.lastNumber, '12301');
      expect(find.text('Test Express'), findsOneWidget);
      expect(find.text('Database records'), findsOneWidget);
      expect(find.text('ML PREDICTION'), findsNothing);
      expect(find.text('20:47'), findsNothing);
      await tester.ensureVisible(find.text('Scheduled: 10:00'));
      await tester.pumpAndSettle();
      expect(find.text('Scheduled: 10:00'), findsOneWidget);
      expect(find.text('Arrival difference unavailable'), findsOneWidget);
      expect(find.text('Why this ETA?'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'refresh retains stale data and recovers after connection failure',
    (tester) async {
      final repo = TestRepository();
      await pumpApp(tester, repo, location: '/trains/12301');
      repo.offline = true;
      await tester.tap(find.byKey(const Key('refresh-journey')));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Showing last fetched status'),
        findsOneWidget,
      );
      expect(find.text('Test Express'), findsOneWidget);
      repo.offline = false;
      await tester.tap(find.byKey(const Key('refresh-journey')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Showing last fetched'), findsNothing);
      expect(repo.calls, 3);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('not found and direct-route back navigation are safe', (
    tester,
  ) async {
    final repo = TestRepository()..noTrain = true;
    await pumpApp(tester, repo, location: '/trains/99999');
    expect(find.textContaining('Train not found'), findsOneWidget);
    await tester.tap(find.byTooltip('Back to search'));
    await tester.pumpAndSettle();
    expect(find.text('Find your train'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ETA failure retains the backend status and route', (
    tester,
  ) async {
    final repo = TestRepository()..etaOnlyFailure = true;
    await pumpApp(tester, repo, location: '/trains/12301');
    expect(find.text('Test Express'), findsOneWidget);
    expect(find.textContaining('ETA service unavailable'), findsOneWidget);
    expect(find.text('Stations on your route'), findsOneWidget);
    expect(find.text('Last reported station'), findsOneWidget);
  });

  testWidgets(
    'station picker uses selected endpoints and displays empty results',
    (tester) async {
      phone(tester);
      final repo = TestRepository()..emptySearch = true;
      await pumpApp(tester, repo);
      for (final pair in [
        ('origin-picker', 'AAA'),
        ('destination-picker', 'CCC'),
      ]) {
        await revealTap(tester, find.byKey(Key(pair.$1)));
        await tester.enterText(find.byKey(const Key('station-query')), pair.$2);
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pumpAndSettle();
        await tester.tap(find.text('${pair.$2} station'));
        await tester.pumpAndSettle();
      }
      await revealTap(tester, find.byKey(const Key('search-trains')));
      expect(repo.searchedFrom, 'AAA');
      expect(repo.searchedTo, 'CCC');
      expect(repo.searchedDate, isNull);
      expect(find.text('Train search results'), findsOneWidget);
      expect(find.text('Have a train number?'), findsNothing);
      expect(find.textContaining('No trains match'), findsOneWidget);
      await tester.tap(find.byTooltip('Back to search'));
      await tester.pumpAndSettle();
      expect(find.text('Find your train'), findsOneWidget);
      expect(find.text('AAA station (AAA)'), findsOneWidget);
      expect(find.text('CCC station (CCC)'), findsOneWidget);
      expect(find.textContaining('No trains match'), findsNothing);
      expect(repo.searchCalls, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('results deep link sends date and provides back navigation', (
    tester,
  ) async {
    phone(tester);
    final repo = TestRepository();
    await pumpApp(
      tester,
      repo,
      location: '/search?from=AAA&to=CCC&date=2026-09-23',
    );
    expect(repo.searchedDate, DateTime(2026, 9, 23));
    expect(find.text('Train search results'), findsOneWidget);
    await tester.tap(find.byTooltip('Back to search'));
    await tester.pumpAndSettle();
    expect(find.text('Find your train'), findsOneWidget);
  });

  testWidgets('home and results support enlarged text', (tester) async {
    phone(tester, scale: 2);
    await pumpApp(tester, TestRepository());
    expect(tester.takeException(), isNull);
    await pumpApp(
      tester,
      TestRepository(),
      location: '/search?from=AAA&to=CCC',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('narrow phone with enlarged text has no overflow', (
    tester,
  ) async {
    phone(tester, scale: 2);
    final repo = TestRepository();
    await pumpApp(tester, repo, location: '/trains/12301');
    expect(tester.takeException(), isNull);
    await tester.drag(
      find.byType(SingleChildScrollView).first,
      const Offset(0, -1200),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('loading is visible and overlapping refreshes are prevented', (
    tester,
  ) async {
    final repo = TestRepository()..pending = Completer<JourneyResult>();
    final router = createAppRouter(initialLocation: '/trains/12301');
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [trainRepositoryProvider.overrideWithValue(repo)],
        child: SihEtaMobileApp(router: router),
      ),
    );
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byKey(const Key('refresh-journey')));
    expect(repo.calls, 1);
    repo.pending!.complete(
      JourneyResult(
        ApiResult.success(TrainStatus.fromJson(statusJson())),
        ApiResult.success(ETAModel.fromJson(etaJson())),
        DateTime.now(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Test Express'), findsOneWidget);
  });
}
