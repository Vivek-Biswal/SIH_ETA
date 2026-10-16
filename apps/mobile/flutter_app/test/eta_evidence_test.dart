import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/shared/widgets/eta_display.dart';

Map<String, dynamic> response({String method = 'delay_adjusted'}) => {
  'train_number': '12301',
  'train_name': 'Test Express',
  'prediction_method': method,
  'remaining_stations': <dynamic>[],
  'delay_factors': <dynamic>[],
  'data_source': 'live',
};

Future<void> openEvidence(WidgetTester tester, ETAModel evidence) async {
  tester.view.physicalSize = const Size(390, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: EtaDisplay(
            destination: 'Test station',
            scheduledTime: '2026-10-15T14:00:00+05:30',
            predictedTime: '2026-10-15T14:20:00+05:30',
            delayMinutes: 20,
            method: evidence.methodLabel,
            evidence: evidence,
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Why this ETA?'));
  await tester.pumpAndSettle();
}

void main() {
  test('older ETA responses remain valid without model metadata', () {
    final evidence = ETAModel.fromJson(response());
    expect(evidence.modelMetadata, isNull);
    expect(evidence.observationTimestamp, isNull);
    expect(evidence.methodLabel, 'Observed-delay estimate');
  });

  test('validation discards nonfinite and negative errors', () {
    final validation = EtaValidation.fromJson({
      'mae_minutes': double.nan,
      'baseline_mae_minutes': -1,
      'rmse_minutes': double.infinity,
      'test_journeys': 0,
    });
    expect(validation.maeMinutes, isNull);
    expect(validation.baselineMaeMinutes, isNull);
    expect(validation.rmseMinutes, isNull);
    expect(validation.testJourneys, isNull);
  });

  testWidgets('a late train shows the actual explanation and baseline reason', (
    tester,
  ) async {
    final json = response()
      ..['explanation'] = 'The current 20 minute delay is carried forward.'
      ..['model_version'] = 'observed-delay-baseline-v1'
      ..['model_metadata'] = {
        'status': 'unavailable',
        'reason':
            'No validated trained model is installed. The baseline is used.',
      };
    await openEvidence(tester, ETAModel.fromJson(json));
    expect(
      find.text('The current 20 minute delay is carried forward.'),
      findsOneWidget,
    );
    expect(
      find.text(
        'No validated trained model is installed. The baseline is used.',
      ),
      findsOneWidget,
    );
    expect(find.text('Model status: unavailable'), findsOneWidget);
    expect(
      find.textContaining(
        'The train was held to allow another service to pass.',
      ),
      findsNothing,
    );
    expect(find.textContaining('Static educational examples.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'trained ETA evidence shows historical validation without a confidence claim',
    (tester) async {
      final json = response(method: 'inference')
        ..['explanation'] =
            'The fitted model uses previous station delays and the remaining timetable.'
        ..['model_version'] = 'test-model-v1'
        ..['model_metadata'] = {
          'status': 'active',
          'name': 'Arrival delay regression',
          'training_cutoff': '2026-09-30',
          'validation': {
            'mae_minutes': 8.25,
            'baseline_mae_minutes': 12,
            'rmse_minutes': 11.5,
            'test_journeys': 100,
          },
        };
      await openEvidence(tester, ETAModel.fromJson(json));
      expect(find.text('Method: Trained model estimate'), findsOneWidget);
      expect(find.text('Average absolute error: 8.3 min'), findsOneWidget);
      expect(
        find.text('Previous approach: 12.0 min average absolute error'),
        findsOneWidget,
      );
      expect(find.text('Evaluated on 100 held-out journeys.'), findsOneWidget);
      expect(find.textContaining('confidence'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
