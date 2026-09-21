import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sih_eta/core/services/preferences.dart';
import 'package:sih_eta/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('passenger shell themes and future network space on device', (
    tester,
  ) async {
    final router = createAppRouter();
    final container = ProviderContainer();
    addTearDown(router.dispose);
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: SihEtaMobileApp(router: router),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Find your train'), findsOneWidget);
    await tester.tap(find.text('Travel tools'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Dark'));
    await tester.pumpAndSettle();
    expect(container.read(appearanceProvider), ThemeMode.dark);
    await tester.tap(find.text('Light'));
    await tester.pumpAndSettle();
    expect(container.read(appearanceProvider), ThemeMode.light);
    await tester.tap(find.text('Network'));
    await tester.pumpAndSettle();
    expect(find.textContaining('No network feed is connected'), findsOneWidget);
    await tester.tap(find.text('Find your train'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('train-number')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
