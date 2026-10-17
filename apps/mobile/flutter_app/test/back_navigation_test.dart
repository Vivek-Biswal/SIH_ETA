import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/services/saved_journeys.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/features/explore/explore_screen.dart';
import 'package:sih_eta/features/home/home_screen.dart';
import 'package:sih_eta/features/home/train_search_results_screen.dart';
import 'package:sih_eta/features/network/journey_workspace_screen.dart';
import 'package:sih_eta/features/saved/saved_journeys_screen.dart';
import 'package:sih_eta/features/train_details/train_details_screen.dart';
import 'package:sih_eta/main.dart';

import 'passenger_flow_test.dart' show TestRepository, revealTap;

/// These tests exercise Flutter's platform Back dispatch. Android's actual
/// hardware button and edge gestures also need device/emulator verification.
Future<void> _systemBack(WidgetTester tester) async {
  expect(await tester.binding.handlePopRoute(), isTrue);
  await tester.pumpAndSettle();
  expect(tester.takeException(), isNull);
}

Future<({GoRouter router, TestRepository repository})> _launch(
  WidgetTester tester, {
  String location = '/',
  List<SavedJourney> saved = const [],
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  SharedPreferences.setMockInitialValues({
    SavedJourneys.storageKey: saved.map((s) => jsonEncode(s.toJson())).toList(),
  });
  final prefs = await SharedPreferences.getInstance();
  final repository = TestRepository();
  final router = createAppRouter(initialLocation: location);
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    router.dispose();
  });
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        preferencesProvider.overrideWithValue(prefs),
        trainRepositoryProvider.overrideWithValue(repository),
      ],
      child: SihEtaMobileApp(router: router, enableOnboarding: false),
    ),
  );
  await tester.pumpAndSettle();
  return (router: router, repository: repository);
}

Future<void> _chooseStation(
  WidgetTester tester,
  String field,
  String code,
) async {
  await revealTap(tester, find.byKey(Key(field)));
  await tester.enterText(find.byKey(const Key('station-query')), code);
  await tester.pump(const Duration(milliseconds: 250));
  await tester.pumpAndSettle();
  await tester.tap(find.text('$code station'));
  await tester.pumpAndSettle();
}

Future<void> _appBarBack(WidgetTester tester) async {
  final appBar = find.byType(AppBar);
  final arrow = find.descendant(
    of: appBar,
    matching: find.byIcon(Icons.arrow_back),
  );
  if (arrow.evaluate().isNotEmpty) {
    await tester.tap(arrow.first);
  } else {
    await tester.tap(
      find.descendant(of: appBar, matching: find.byType(BackButton)),
    );
  }
  await tester.pumpAndSettle();
  expect(tester.takeException(), isNull);
}

void _navigationTest(String description, WidgetTesterCallback callback) {
  testWidgets(
    description,
    callback,
    // Exercise the native fallback without a network or platform WebView.
    variant: TargetPlatformVariant.only(TargetPlatform.linux),
  );
}

void main() {
  _navigationTest(
    'system Back restores results then the selected search form',
    (tester) async {
      final app = await _launch(tester);
      await _chooseStation(tester, 'origin-picker', 'AAA');
      await _chooseStation(tester, 'destination-picker', 'CCC');
      await revealTap(tester, find.byKey(const Key('search-trains')));
      expect(find.byType(TrainSearchResultsScreen), findsOneWidget);
      await revealTap(tester, find.text('Test Express'));
      expect(find.byType(TrainDetailsScreen), findsOneWidget);

      await _systemBack(tester);
      expect(find.byType(TrainSearchResultsScreen), findsOneWidget);
      expect(find.text('Test Express'), findsOneWidget);
      expect(app.repository.searchCalls, 1);

      await _systemBack(tester);
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(find.text('AAA station (AAA)'), findsOneWidget);
      expect(find.text('CCC station (CCC)'), findsOneWidget);
      expect(app.router.canPop(), isFalse);
    },
  );

  _navigationTest(
    'app Back returns to Saved rather than discarding its origin',
    (tester) async {
      const journey = SavedJourney(
        trainNumber: '12301',
        trainName: 'Test Express',
        journeyDate: '2026-09-20',
        stationCode: 'CCC',
      );
      final app = await _launch(tester, saved: [journey]);
      await tester.tap(find.text('Saved'));
      await tester.pumpAndSettle();
      await revealTap(tester, find.byKey(Key('open-saved-${journey.id}')));
      expect(find.byType(TrainDetailsScreen), findsOneWidget);

      await _appBarBack(tester);
      expect(find.byType(SavedJourneysScreen), findsOneWidget);
      expect(find.text('Test Express'), findsOneWidget);
      expect(app.repository.calls, 1);
      await _systemBack(tester);
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(app.router.canPop(), isFalse);
    },
  );

  _navigationTest(
    'Back follows Help to Insights history and ignores reselected tab',
    (tester) async {
      final app = await _launch(tester);
      await tester.tap(find.text('Help'));
      await tester.pumpAndSettle();
      expect(find.byType(ExploreScreen), findsOneWidget);
      await tester.tap(find.text('Insights'));
      await tester.pumpAndSettle();
      expect(find.byType(JourneyWorkspaceScreen), findsOneWidget);
      await tester.tap(find.text('Insights'));
      await tester.pumpAndSettle();

      await _systemBack(tester);
      expect(find.byType(ExploreScreen), findsOneWidget);
      expect(find.byType(JourneyWorkspaceScreen), findsNothing);
      await _appBarBack(tester);
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(app.router.canPop(), isFalse);
    },
  );

  _navigationTest(
    'platform Back dismisses a station dialog before its screen',
    (tester) async {
      final app = await _launch(tester);
      await revealTap(tester, find.byKey(const Key('origin-picker')));
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.enterText(find.byKey(const Key('station-query')), 'AAA');
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pumpAndSettle();

      await _systemBack(tester);
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.byType(HomeScreen), findsOneWidget);
      expect(app.router.canPop(), isFalse);
    },
  );

  for (final location in ['/trains/12301', '/search?from=AAA&to=CCC']) {
    _navigationTest(
      'direct $location has a safe Home ancestor for system Back',
      (tester) async {
        final app = await _launch(tester, location: location);
        expect(app.router.canPop(), isTrue);
        await _systemBack(tester);
        expect(find.byType(HomeScreen), findsOneWidget);
        expect(app.router.canPop(), isFalse);
      },
    );
  }

  _navigationTest(
    'root Back delegates to the system instead of adding a Home page',
    (tester) async {
      final app = await _launch(tester);
      var exits = 0;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'SystemNavigator.pop') exits++;
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );

      expect(await tester.binding.handlePopRoute(), isFalse);
      await tester.pumpAndSettle();
      expect(exits, 1);
      expect(app.router.canPop(), isFalse);
      expect(find.byType(HomeScreen), findsOneWidget);
    },
  );

  _navigationTest('tab Back keeps form contents and exact Home scroll state', (
    tester,
  ) async {
    final app = await _launch(tester);
    final field = find.byKey(const Key('train-number'));
    await tester.enterText(field, '12301');
    await tester.tapAt(const Offset(10, 110));
    await tester.pumpAndSettle();
    final scroll = find
        .descendant(
          of: find.byType(HomeScreen),
          matching: find.byType(Scrollable),
        )
        .first;
    await tester.drag(scroll, const Offset(0, -350));
    await tester.pumpAndSettle();
    final originalScroll = tester.state<ScrollableState>(scroll);
    final originalOffset = originalScroll.position.pixels;
    expect(originalOffset, greaterThan(0));

    await tester.tap(find.text('Saved'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Saved'));
    await tester.pumpAndSettle();
    await _systemBack(tester);

    final restoredScroll = tester.state<ScrollableState>(scroll);
    expect(identical(originalScroll, restoredScroll), isTrue);
    expect(restoredScroll.position.pixels, closeTo(originalOffset, 0.01));
    expect(tester.widget<TextFormField>(field).controller?.text, '12301');
    expect(app.router.canPop(), isFalse);
    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();
    expect(app.router.canPop(), isFalse);
  });
}
