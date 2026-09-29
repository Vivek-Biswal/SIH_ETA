import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/services/onboarding_preferences.dart';
import 'package:sih_eta/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'first launch, guide replay, themes, saved tab and real network analysis',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final router = createAppRouter();
      addTearDown(router.dispose);
      final container = ProviderContainer(
        overrides: [preferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: SihEtaMobileApp(router: router),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Welcome to Etaernal'), findsOneWidget);
      for (var page = 0; page < 3; page++) {
        await tester.tap(find.text('Next'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(prefs.getBool(OnboardingPreferences.completedKey), true);
      expect(find.byKey(const Key('train-number')), findsOneWidget);
      await tester.tap(find.text('Saved'));
      await tester.pumpAndSettle();
      expect(find.text('Keep your train handy'), findsOneWidget);
      await tester.tap(find.text('Help'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('replay-guide')));
      await tester.pumpAndSettle();
      expect(find.text('Your travel guide'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Dark'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Dark'));
      await tester.pumpAndSettle();
      expect(container.read(appearanceProvider), ThemeMode.dark);
      await tester.tap(find.text('Network'));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 45),
      );
      expect(find.textContaining('Records from 2024-09-01'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('network-query')));
      await tester.enterText(find.byKey(const Key('network-query')), 'NDLS');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 45),
      );
      await tester.scrollUntilVisible(
        find.text('Explore recorded interactions'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.byWidgetPredicate(
          (widget) => widget is Text && widget.data == 'NDLS',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Explore recorded interactions'));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 45),
      );
      await tester.scrollUntilVisible(
        find.textContaining('Check latest status').first,
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining('Check latest status').first, findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
