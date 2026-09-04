import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SihEtaMobileApp()));
    expect(find.byType(SihEtaMobileApp), findsOneWidget);
  });
}
