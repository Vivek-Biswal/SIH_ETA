import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/services/eta_feedback.dart';
import 'package:sih_eta/core/theme/app_theme.dart';
import 'package:sih_eta/shared/widgets/eta_display.dart';
import 'package:sih_eta/shared/widgets/eta_feedback.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android ETA and feedback submit to the real local HTTP API', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final repository = EtaFeedbackRepository(
      prefs,
      endpoint: 'http://10.0.2.2:8095/api/v1/passenger/eta-feedback',
    );
    addTearDown(repository.close);
    final now = DateTime.now().toUtc();
    final observed = now.subtract(const Duration(minutes: 1)).toIso8601String();
    final scheduled = now.add(const Duration(hours: 1)).toIso8601String();
    final predicted = now
        .add(const Duration(hours: 1, minutes: 12))
        .toIso8601String();
    final eta = ETAModel.fromJson({
      'train_number': '12423',
      'train_name': 'Verification fixture',
      'date': '2026-10-15',
      'data_source': 'live',
      'prediction_method': 'delay_adjusted',
      'observation_timestamp': observed,
      'remaining_stations': [],
    });
    final prediction = StationPrediction.fromJson({
      'station': {'code': 'NDLS', 'name': 'New Delhi'},
      'scheduled_arrival': scheduled,
      'predicted_arrival': predicted,
      'predicted_delay_minutes': 12,
      'prediction_method': 'delay_adjusted',
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          etaFeedbackRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          theme: AppTheme.darkTheme,
          home: Scaffold(
            appBar: AppBar(
              title: const Text('Etaernal · verification fixture'),
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  EtaDisplay(
                    destination: 'New Delhi',
                    scheduledTime: scheduled,
                    predictedTime: predicted,
                    delayMinutes: 12,
                    evidence: eta,
                    stationPrediction: prediction,
                    trainStatus: 'running',
                    method: eta.methodLabel,
                  ),
                  EtaFeedbackCard(
                    trainNumber: '12423',
                    date: '2026-10-15',
                    stationCode: 'NDLS',
                    stationName: 'New Delhi',
                    predictedArrival: predicted,
                    observedAt: observed,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Expected arrival'), findsOneWidget);
    await tester.ensureVisible(find.text('Accurate'));
    await tester.tap(find.text('Accurate'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      'Automated local verification report.',
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('send-eta-feedback')));
    await tester.tap(find.byKey(const Key('send-eta-feedback')));
    for (var i = 0; i < 80 && !repository.reports.any((r) => r.sent); i++) {
      await tester.pump(const Duration(milliseconds: 250));
    }
    await tester.pumpAndSettle();
    expect(repository.reports.single.sent, true);
    expect(find.text('Feedback received. Thank you.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
