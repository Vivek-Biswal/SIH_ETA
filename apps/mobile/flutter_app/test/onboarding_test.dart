import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/services/onboarding_preferences.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/core/theme/app_theme.dart';
import 'package:sih_eta/features/onboarding/onboarding_screen.dart';

Future<SharedPreferences> freshPreferences() async {
  SharedPreferences.setMockInitialValues({});
  return SharedPreferences.getInstance();
}

Widget guideApp({
  required SharedPreferences preferences,
  required VoidCallback onFinished,
  bool replay = false,
  bool dark = false,
  double textScale = 1,
}) => ProviderScope(
  overrides: [preferencesProvider.overrideWithValue(preferences)],
  child: MaterialApp(
    theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(textScale)),
      child: child!,
    ),
    home: OnboardingScreen(onFinished: onFinished, replay: replay),
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('guide completion survives a new provider container', () async {
    final preferences = await freshPreferences();
    final firstLaunch = ProviderContainer(
      overrides: [preferencesProvider.overrideWithValue(preferences)],
    );
    expect(firstLaunch.read(onboardingProvider), isFalse);
    await firstLaunch.read(onboardingProvider.notifier).complete();
    expect(firstLaunch.read(onboardingProvider), isTrue);
    firstLaunch.dispose();

    final nextLaunch = ProviderContainer(
      overrides: [preferencesProvider.overrideWithValue(preferences)],
    );
    addTearDown(nextLaunch.dispose);
    expect(nextLaunch.read(onboardingProvider), isTrue);
  });

  testWidgets('Skip saves completion and calls the supplied callback', (
    tester,
  ) async {
    final preferences = await freshPreferences();
    var finished = 0;
    await tester.pumpWidget(
      guideApp(preferences: preferences, onFinished: () => finished++),
    );

    expect(find.text('Step 1 of 4'), findsOneWidget);
    expect(find.text('Back'), findsNothing);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    expect(finished, 1);
    expect(preferences.getBool(OnboardingPreferences.completedKey), isTrue);
    // The guide leaves navigation to its caller.
    expect(find.byType(OnboardingScreen), findsOneWidget);
  });

  testWidgets('Next and Back keep progress until Done completes the guide', (
    tester,
  ) async {
    final preferences = await freshPreferences();
    var finished = 0;
    await tester.pumpWidget(
      guideApp(preferences: preferences, onFinished: () => finished++),
    );

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 4'), findsOneWidget);
    expect(find.text('Understand your arrival time'), findsOneWidget);
    expect(find.textContaining('every 30 seconds'), findsOneWidget);
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Step 1 of 4'), findsOneWidget);

    for (var index = 0; index < 3; index++) {
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
    }
    expect(find.text('Step 4 of 4'), findsOneWidget);
    expect(find.text('Ready for your journey'), findsOneWidget);
    expect(finished, 0);
    expect(preferences.getBool(OnboardingPreferences.completedKey), isNull);

    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(finished, 1);
    expect(preferences.getBool(OnboardingPreferences.completedKey), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a replay can close without changing completion preference', (
    tester,
  ) async {
    final preferences = await freshPreferences();
    var finished = 0;
    await tester.pumpWidget(
      guideApp(
        preferences: preferences,
        onFinished: () => finished++,
        replay: true,
      ),
    );
    expect(find.text('Your travel guide'), findsOneWidget);
    await tester.tap(find.text('Close'));
    await tester.pumpAndSettle();
    expect(finished, 1);
    expect(preferences.getBool(OnboardingPreferences.completedKey), isNull);
  });

  for (final dark in [false, true]) {
    testWidgets(
      'all steps fit a narrow phone with large text in ${dark ? 'dark' : 'light'} mode',
      (tester) async {
        tester.view.physicalSize = const Size(320, 568);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final preferences = await freshPreferences();
        var finished = 0;
        await tester.pumpWidget(
          guideApp(
            preferences: preferences,
            onFinished: () => finished++,
            dark: dark,
            textScale: 2,
          ),
        );

        for (var index = 0; index < 4; index++) {
          expect(tester.takeException(), isNull);
          expect(find.text('Step ${index + 1} of 4'), findsOneWidget);
          // Every explanation remains reachable even when it cannot fit at once.
          await tester.drag(
            find.byType(SingleChildScrollView),
            const Offset(0, -2000),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          await tester.tap(find.text(index == 3 ? 'Done' : 'Next'));
          await tester.pumpAndSettle();
        }
        expect(finished, 1);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
