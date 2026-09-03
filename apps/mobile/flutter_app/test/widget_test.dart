import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SihEtaMobileApp());
    expect(find.byType(SihEtaMobileApp), findsOneWidget);
  });
}
