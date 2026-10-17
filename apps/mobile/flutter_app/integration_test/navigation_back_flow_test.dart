import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/services/saved_journeys.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/features/home/home_screen.dart';
import 'package:sih_eta/features/saved/saved_journeys_screen.dart';
import 'package:sih_eta/features/train_details/train_details_screen.dart';
import 'package:sih_eta/main.dart';

import '../test/passenger_flow_test.dart' show TestRepository;

const _runToken = String.fromEnvironment(
  'NAV_RUN_TOKEN',
  defaultValue: 'manual',
);

/// The host harness reacts to these logcat markers with an actual Android
/// KEYCODE_BACK or an edge swipe. This test never simulates system Back through
/// WidgetTester, WidgetsBinding, or the Dart navigation channel.
void _stage(String name) => debugPrint('ETAERNAL_NAV:$_runToken:$name');

Future<void> _waitFor(
  WidgetTester tester,
  Finder finder, {
  bool absent = false,
}) async {
  final deadline = DateTime.now().add(const Duration(seconds: 45));
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isEmpty == absent) {
      await tester.pumpAndSettle();
      return;
    }
  }
  fail(
    'Timed out waiting for ${absent ? 'dismissal of ' : ''}$finder. '
    'Run scripts/verify_android_back.py to provide real Android Back input.',
  );
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _hideKeyboard(WidgetTester tester) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await SystemChannels.textInput.invokeMethod<void>('TextInput.hide');
  await tester.pumpAndSettle();
  // Wait for the native IME animation before signalling the host. A Back event
  // intended for a route must not merely close an open Android keyboard.
  await tester.runAsync(() => Future<void>.delayed(const Duration(seconds: 1)));
  await tester.pump(const Duration(milliseconds: 500));
}

void _expectRetainedHome(WidgetTester tester) {
  expect(find.byType(HomeScreen), findsOneWidget);
  expect(
    tester
        .widget<TextFormField>(find.byKey(const Key('train-number')))
        .controller
        ?.text,
    '12301',
  );
  expect(tester.takeException(), isNull);
}

void main() {
  // Real Android edge gestures need normal vsync and native pointer delivery;
  // the default test frame policy renders only explicitly pumped frames.
  IntegrationTestWidgetsFlutterBinding.ensureInitialized()
    ..framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive
    ..shouldPropagateDevicePointerEvents = true;

  testWidgets('real Android Back buttons and gestures restore navigation', (
    tester,
  ) async {
    const saved = SavedJourney(
      trainNumber: '12301',
      trainName: 'Test Express',
      journeyDate: '2026-09-20',
      stationCode: 'CCC',
    );
    SharedPreferences.setMockInitialValues({
      SavedJourneys.storageKey: [jsonEncode(saved.toJson())],
    });
    final prefs = await SharedPreferences.getInstance();
    final repository = TestRepository();
    final router = createAppRouter();
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
    await tester.enterText(find.byKey(const Key('train-number')), '12301');
    await _hideKeyboard(tester);

    await _tap(tester, find.text('Saved'));
    await _tap(tester, find.byKey(Key('open-saved-${saved.id}')));
    expect(find.byType(TrainDetailsScreen), findsOneWidget);
    _stage('DETAILS_KEY');
    await _waitFor(tester, find.byType(SavedJourneysScreen));
    expect(find.byType(TrainDetailsScreen), findsNothing);
    _stage('SAVED_KEY');
    await _waitFor(tester, find.byType(HomeScreen));
    _expectRetainedHome(tester);

    await _tap(tester, find.byKey(const Key('origin-picker')));
    expect(find.byType(AlertDialog), findsOneWidget);
    await _hideKeyboard(tester);
    _stage('DIALOG_KEY');
    await _waitFor(tester, find.byType(AlertDialog), absent: true);
    _expectRetainedHome(tester);
    expect(router.canPop(), isFalse);

    // The same route opened directly from Search must return to that Search
    // instance through its visible in-app Back button.
    await _tap(tester, find.byKey(const Key('find-train')));
    expect(find.byType(TrainDetailsScreen), findsOneWidget);
    final appBarArrow = find.descendant(
      of: find.byType(AppBar),
      matching: find.byIcon(Icons.arrow_back),
    );
    await tester.tap(appBarArrow.first);
    await tester.pumpAndSettle();
    _expectRetainedHome(tester);

    await _tap(tester, find.text('Saved'));
    await _tap(tester, find.byKey(Key('open-saved-${saved.id}')));
    _stage('DETAILS_GESTURE');
    await _waitFor(tester, find.byType(SavedJourneysScreen));
    expect(find.byType(TrainDetailsScreen), findsNothing);
    _stage('SAVED_GESTURE');
    await _waitFor(tester, find.byType(HomeScreen));
    _expectRetainedHome(tester);
    expect(router.canPop(), isFalse);
    expect(repository.calls, 3);
    _stage('FINISHED');
  });
}
