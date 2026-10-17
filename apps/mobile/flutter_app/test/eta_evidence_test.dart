import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/core/models/journey_view.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/shared/widgets/eta_display.dart';

final fixedNow = DateTime.parse('2026-10-16T10:00:00Z');

ETAModel evidence({
  String method = 'delay_adjusted',
  String? observed,
  String source = 'live',
}) => ETAModel.fromJson({
  'train_number': '12301',
  'train_name': 'Test Express',
  'date': '2026-10-16',
  'prediction_method': method,
  'observation_timestamp': observed ?? '2026-10-16T09:59:00Z',
  'remaining_stations': <dynamic>[],
  'delay_factors': <dynamic>[],
  'data_source': source,
  'explanation': 'Delayed by a signal problem everywhere.',
  'model_metadata': {
    'status': 'fallback',
    'name': 'Technical model name',
    'validation': {
      'mae_minutes': 15.4,
      'rmse_minutes': 27.2,
      'baseline_mae_minutes': 19,
      'test_journeys': 229,
    },
  },
});

StationPrediction stop({
  String code = 'KND',
  int delay = 20,
  String method = 'delay_adjusted',
  int? sequence,
  String? actual,
  bool includeActual = true,
  Map<String, dynamic>? reason,
  DateTime? now,
}) {
  final clock = now ?? fixedNow;
  return StationPrediction.fromJson({
    'station': {'code': code, 'name': code == 'KND' ? 'Kandra' : 'Bhubaneswar'},
    'scheduled_arrival': clock.add(const Duration(hours: 1)).toIso8601String(),
    'predicted_arrival': clock
        .add(Duration(hours: 1, minutes: delay))
        .toIso8601String(),
    'predicted_delay_minutes': delay,
    'prediction_method': method,
    if (sequence != null) 'route_sequence': sequence,
    if (includeActual) 'actual_arrival': actual,
    if (reason != null) 'arrival_explanation': reason,
  });
}

PassengerArrivalReason explanation(
  StationPrediction prediction, {
  ETAModel? eta,
  String? state = 'running',
  String? actual,
}) => passengerArrivalReason(
  destination: prediction.station!.label,
  scheduled: prediction.scheduledArrival,
  predicted: prediction.predictedArrival,
  actual: actual,
  prediction: prediction,
  evidence: eta ?? evidence(),
  trainStatus: state,
  now: fixedNow,
  runningDelay: 20,
);

Widget arrivalWidget(StationPrediction prediction, ETAModel eta) => MaterialApp(
  home: Scaffold(
    body: SingleChildScrollView(
      child: EtaDisplay(
        destination: prediction.station!.label,
        scheduledTime: prediction.scheduledArrival,
        predictedTime: prediction.predictedArrival,
        stationPrediction: prediction,
        evidence: eta,
        delayMinutes: 20,
        trainStatus: 'running',
        method: eta.methodLabel,
      ),
    ),
  ),
);

Map<String, dynamic> recoveryReason({
  String status = 'delayed',
  int current = 14,
  int? recovered = 4,
  int? futureRecovery = 5,
  int? futureDelay = 0,
  String futureStatus = 'estimated',
}) => {
  'status': status,
  'title': 'Arrival at Kandra',
  'summary': 'Expected arrival at Kandra from the latest train update.',
  'details': ['The cause of the delay could not be confirmed.'],
  'timing': {
    'current_delay_minutes': current,
    'recovered_minutes': recovered,
    'recovery_from_station': 'Dhul Kot',
    'recovery_to_station': 'Lalru',
    'expected_recovery_minutes': futureRecovery,
    'expected_additional_delay_minutes': futureDelay,
    'future_recovery_status': futureStatus,
  },
};

void main() {
  test('older ETA responses remain valid without new station fields', () {
    final eta = ETAModel.fromJson({
      'train_number': '12301',
      'train_name': 'Test Express',
      'prediction_method': 'delay_adjusted',
      'remaining_stations': [
        {
          'station': {'code': 'KND'},
          'predicted_arrival': null,
        },
      ],
    });
    expect(eta.remainingStations.single.arrivalExplanation, isNull);
    expect(eta.remainingStations.single.hasConfirmedArrivalField, isFalse);
    expect(eta.modelMetadata, isNull);
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

  test('recovery fields stay optional and reject invalid timing values', () {
    final old = ArrivalExplanation.fromJson({'status': 'delayed'});
    expect(old.timing, isNull);
    final timing = ArrivalTiming.fromJson({
      'current_delay_minutes': -5,
      'recovered_minutes': -2,
      'expected_recovery_minutes': double.nan,
      'expected_additional_delay_minutes': double.infinity,
      'recovery_from_station': '',
      'future_recovery_status': 'made_up',
    });
    expect(timing.currentDelayMinutes, -5);
    expect(timing.recoveredMinutes, isNull);
    expect(timing.expectedRecoveryMinutes, isNull);
    expect(timing.expectedAdditionalDelayMinutes, isNull);
    expect(timing.recoveryFromStation, isNull);
    expect(timing.futureRecoveryStatus, 'not_estimated');
  });

  test('observed recovery and selected forecast recovery remain separate', () {
    final result = explanation(
      stop(delay: 9, method: 'inference', reason: recoveryReason()),
    );
    expect(result.timing?.currentDelayMinutes, 14);
    expect(result.timing?.recoveredMinutes, 4);
    expect(result.timing?.recoveryFromStation, 'Dhul Kot');
    expect(result.timing?.recoveryToStation, 'Lalru');
    expect(result.timing?.expectedRecoveryMinutes, 5);
    expect(result.timing?.futureRecoveryStatus, 'estimated');
  });

  test('impossible or incomplete recovery forecasts are withheld', () {
    for (final reason in [
      recoveryReason(futureRecovery: 20),
      recoveryReason(futureRecovery: 5, futureDelay: 3),
      recoveryReason(futureRecovery: null, futureDelay: 3),
    ]) {
      final result = explanation(stop(method: 'inference', reason: reason));
      expect(result.timing?.expectedRecoveryMinutes, isNull);
      expect(result.timing?.expectedAdditionalDelayMinutes, isNull);
      expect(result.timing?.futureRecoveryStatus, 'not_estimated');
    }
  });

  test('fallback and route order adjustment cannot claim future recovery', () {
    final fallback = explanation(stop(reason: recoveryReason()));
    expect(fallback.timing?.recoveredMinutes, 4);
    expect(fallback.timing?.expectedRecoveryMinutes, isNull);
    expect(fallback.timing?.futureRecoveryStatus, 'not_estimated');
    final ordered = explanation(
      stop(
        method: 'inference',
        reason: recoveryReason(futureStatus: 'route_order_adjusted'),
      ),
    );
    expect(ordered.timing?.expectedRecoveryMinutes, isNull);
    expect(ordered.timing?.futureRecoveryStatus, 'route_order_adjusted');
    final unknownPair = recoveryReason();
    (unknownPair['timing'] as Map).remove('recovery_from_station');
    expect(
      explanation(stop(reason: unknownPair)).timing?.recoveredMinutes,
      isNull,
    );
  });

  test('only a current running future arrival can show timing metrics', () {
    final prediction = stop(reason: recoveryReason());
    for (final state in ['not-started', 'cancelled', 'unknown', 'completed']) {
      expect(explanation(prediction, state: state).timing, isNull);
    }
    expect(
      explanation(
        prediction,
        eta: evidence(observed: '2026-10-16T09:00:00Z'),
      ).timing,
      isNull,
    );
    expect(
      explanation(
        stop(actual: '2026-10-16T09:00:00Z', reason: recoveryReason()),
      ).timing,
      isNull,
    );
    final mismatched = explanation(
      stop(reason: recoveryReason(status: 'on_time')),
    );
    expect(mismatched.timing?.recoveredMinutes, isNull);
    expect(mismatched.timing?.expectedRecoveryMinutes, isNull);
  });

  test(
    'each station gets its own on-time, early or late arrival explanation',
    () {
      final onTime = explanation(stop(delay: 0));
      final early = explanation(stop(code: 'BBS', delay: -8));
      final late = explanation(stop(delay: 20));
      expect(onTime.status, 'on_time');
      expect(onTime.summary, contains('on schedule'));
      expect(early.status, 'early');
      expect(early.summary, contains('Bhubaneswar'));
      expect(early.summary, contains('8 minutes earlier'));
      expect(late.status, 'delayed');
      expect(late.summary, contains('Kandra'));
      expect(late.summary, contains('20 minutes later'));
      expect(late.details.last, contains('has not reported the cause'));
      expect(late.summary, isNot(contains('signal')));
    },
  );

  test(
    'stale, missing and timetable-only records cannot promise a live ETA',
    () {
      final stale = explanation(
        stop(),
        eta: evidence(observed: '2026-10-16T09:00:00Z'),
      );
      expect(stale.status, 'unavailable');
      expect(stale.predicted, isNull);
      expect(stale.summary, contains('too old'));
      expect(
        explanation(stop(), eta: evidence(source: 'cached')).predicted,
        isNull,
      );
      expect(explanation(stop(method: 'schedule_only')).predicted, isNull);
      final missing = evidence(observed: 'invalid');
      expect(explanation(stop(), eta: missing).predicted, isNull);
    },
  );

  test('nonrunning journeys suppress contradictory future predictions', () {
    expect(explanation(stop(), state: 'cancelled').status, 'cancelled');
    expect(explanation(stop(), state: 'not-started').status, 'not_started');
    expect(explanation(stop(), state: 'completed').predicted, isNull);
    expect(explanation(stop(), state: 'unknown').predicted, isNull);
  });

  test('a stale response cannot reuse an optimistic station explanation', () {
    final result = explanation(
      stop(
        reason: {
          'status': 'on_time',
          'title': 'On time',
          'summary': 'Your train will arrive on time.',
          'details': [],
        },
      ),
      eta: evidence(observed: '2026-10-16T09:00:00Z'),
    );
    expect(result.status, 'unavailable');
    expect(result.summary, isNot(contains('arrive on time')));
  });

  test(
    'unknown methods, missing status and future observations cannot claim a forecast',
    () {
      expect(explanation(stop(method: 'unknown')).predicted, isNull);
      expect(explanation(stop(method: 'stored')).predicted, isNull);
      expect(explanation(stop(), state: null).predicted, isNull);
      final result = explanation(
        stop(),
        eta: evidence(observed: '2026-10-16T10:00:01Z'),
      );
      expect(result.status, 'unavailable');
      expect(result.predicted, isNull);
    },
  );

  test(
    'a mismatched server reason cannot claim on time for a delayed station',
    () {
      final result = explanation(
        stop(
          delay: 20,
          reason: {
            'status': 'on_time',
            'title': 'On time',
            'summary': 'This train is on time.',
            'details': ['Incorrect station detail'],
          },
        ),
      );
      expect(result.status, 'delayed');
      expect(result.summary, contains('20 minutes later'));
      expect(result.details, isNot(contains('Incorrect station detail')));
    },
  );

  test('a stop never inherits model coverage from a journey-wide method', () {
    final missingMethod = StationPrediction.fromJson({
      'station': {'code': 'KND'},
      'scheduled_arrival': '2026-10-16T11:00:00Z',
      'predicted_arrival': '2026-10-16T11:20:00Z',
      'predicted_delay_minutes': 20,
    });
    final globalModel = evidence(method: 'inference');
    expect(explanation(missingMethod, eta: globalModel).predicted, isNull);
    expect(explanation(missingMethod, eta: globalModel).status, 'unavailable');
    expect(
      explanation(stop(method: 'delay_adjusted'), eta: globalModel).status,
      'delayed',
    );
  });

  test(
    'signed fractional differences round and new stop delay stays consistent',
    () {
      expect(
        arrivalDifference('2026-10-16T11:00:00Z', '2026-10-16T11:00:40Z'),
        1,
      );
      expect(
        arrivalDifference('2026-10-16T11:00:00Z', '2026-10-16T10:59:20Z'),
        -1,
      );
      final prediction = StationPrediction.fromJson({
        'station': {'code': 'KND'},
        'scheduled_arrival': '2026-10-16T11:00:00Z',
        'predicted_arrival': '2026-10-16T11:00:40Z',
        'prediction_method': 'inference',
        'predicted_delay_minutes': 1,
        'arrival_explanation': {
          'status': 'delayed',
          'title': '1 minute late at Kandra',
          'summary': 'Expected at Kandra 1 minute late.',
          'details': [],
        },
      });
      expect(explanation(prediction).status, 'delayed');
      expect(
        explanation(prediction).summary,
        'Expected at Kandra 1 minute late.',
      );
    },
  );

  test(
    'station reasons survive timetable-only journeys and actuals stay confirmed',
    () {
      final status = TrainStatus.fromJson({
        'train_number': '12301',
        'train_name': 'Test Express',
        'date': '2026-10-16',
        'status': 'not-started',
        'last_known_location': {'updated_at': '2026-10-16T09:59:00Z'},
        'route': [
          {
            'station': {'code': 'KND'},
            'route_sequence': 1,
            'actual_arrival': '2026-10-16T11:00:00Z',
            'has_departed': false,
            'arrival_confirmed': false,
          },
        ],
      });
      final eta = ETAModel.fromJson({
        'train_number': '12301',
        'train_name': 'Test Express',
        'date': '2026-10-16',
        'prediction_method': 'schedule_only',
        'remaining_stations': [
          {
            'station': {'code': 'KND'},
            'route_sequence': 1,
            'actual_arrival': null,
            'arrival_explanation': {
              'status': 'not_started',
              'title': 'Journey has not started',
              'summary':
                  'Your train has not left yet. Kandra is scheduled for 5 PM.',
              'details': [],
            },
          },
        ],
      });
      final entry = journeyStops(status, eta, now: fixedNow).single;
      expect(entry.prediction?.arrivalExplanation?.status, 'not_started');
      expect(entry.confirmedArrival, isNull);
    },
  );

  test(
    'unconfirmed and future provider arrivals are never labelled arrived',
    () {
      final future = fixedNow.add(const Duration(hours: 2)).toIso8601String();
      expect(explanation(stop(actual: future)).actual, isNull);
      expect(
        explanation(stop(), actual: '2026-10-16T09:00:00Z').actual,
        isNull,
      );
      final confirmed = explanation(stop(actual: '2026-10-16T09:50:00Z'));
      expect(confirmed.status, 'arrived');
      expect(confirmed.actual, isNotNull);
    },
  );

  test(
    'a stale snapshot can still show an already confirmed historical arrival',
    () {
      final arrived = explanation(
        stop(actual: '2026-10-16T08:50:00Z'),
        eta: evidence(observed: '2026-10-16T09:00:00Z', source: 'cached'),
      );
      expect(arrived.status, 'arrived');
      expect(arrived.predicted, isNull);
    },
  );

  test('repeated station codes resolve by route sequence only', () {
    final eta = ETAModel.fromJson({
      'train_number': '12301',
      'train_name': 'Test Express',
      'remaining_stations': [
        {
          'station': {'code': 'KND'},
          'route_sequence': 4,
        },
        {
          'station': {'code': 'KND'},
          'route_sequence': 10,
        },
      ],
    });
    expect(uniquePrediction(eta, 'KND'), isNull);
    expect(uniquePrediction(eta, 'KND', sequence: 10)?.routeSequence, 10);
    expect(uniquePrediction(eta, 'KND', sequence: 9), isNull);
  });

  testWidgets(
    'changing station changes the reason; fallback hides model diagnostics',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final now = DateTime.now().toUtc();
      final eta = evidence(
        observed: now.subtract(const Duration(seconds: 30)).toIso8601String(),
      );
      final kandra = stop(
        now: now,
        reason: {
          'status': 'delayed',
          'title': '20 minutes late at Kandra',
          'summary': 'Your train is expected at Kandra 20 minutes late.',
          'details': ['The cause of the delay has not been reported.'],
        },
      );
      await tester.pumpWidget(arrivalWidget(kandra, eta));
      await tester.tap(find.text('Why this ETA?'));
      await tester.pumpAndSettle();
      expect(find.text('Arrival at Kandra (KND)'), findsOneWidget);
      expect(find.textContaining('signal problem'), findsNothing);
      expect(find.textContaining('Static educational examples'), findsNothing);
      expect(find.textContaining('RMSE'), findsNothing);
      expect(find.textContaining('Model status'), findsNothing);
      await tester.tap(find.text('How this estimate was made'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Average arrival error'), findsNothing);
      Navigator.of(tester.element(find.text('Arrival at Kandra (KND)'))).pop();
      await tester.pumpAndSettle();
      await tester.pumpWidget(
        arrivalWidget(
          stop(
            now: now,
            code: 'BBS',
            delay: 0,
            reason: {
              'status': 'on_time',
              'title': 'On schedule at Bhubaneswar',
              'summary': 'Your train is expected at Bhubaneswar on schedule.',
              'details': [],
            },
          ),
          eta,
        ),
      );
      expect(
        find.text('Your train is expected at Bhubaneswar on schedule.'),
        findsOneWidget,
      );
      expect(find.textContaining('20 minutes late'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('recovery explanation fits a narrow screen with large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final now = DateTime.now().toUtc();
    final prediction = stop(
      now: now,
      delay: 9,
      method: 'inference',
      reason: recoveryReason(),
    );
    final eta = evidence(
      observed: now.subtract(const Duration(seconds: 30)).toIso8601String(),
    );
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            child: EtaDisplay(
              destination: prediction.station!.label,
              scheduledTime: prediction.scheduledArrival,
              stationPrediction: prediction,
              evidence: eta,
              trainStatus: 'running',
              method: eta.methodLabel,
            ),
          ),
        ),
      ),
    );
    expect(find.text('Current timing'), findsOneWidget);
    expect(find.text('14 min late'), findsOneWidget);
    expect(find.text('Already recovered'), findsOneWidget);
    expect(find.text('4 min'), findsOneWidget);
    expect(find.text('Between Dhul Kot and Lalru'), findsOneWidget);
    expect(find.text('Possible recovery by Kandra (KND)'), findsOneWidget);
    expect(find.text('About 5 min'), findsOneWidget);
    expect(find.textContaining('has not been recovered yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Why this ETA?'));
    await tester.tap(find.text('Why this ETA?'));
    await tester.pumpAndSettle();
    expect(find.text('Current timing'), findsNWidgets(2));
    expect(find.textContaining('could not be confirmed'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'unknown recovery stays unavailable and early timing stays signed',
    (tester) async {
      final now = DateTime.now().toUtc();
      final eta = evidence(
        observed: now.subtract(const Duration(seconds: 30)).toIso8601String(),
      );
      await tester.pumpWidget(
        arrivalWidget(
          stop(
            now: now,
            delay: -5,
            reason: recoveryReason(
              status: 'early',
              current: -5,
              recovered: null,
              futureRecovery: null,
              futureStatus: 'not_estimated',
            ),
          ),
          eta,
        ),
      );
      expect(find.text('5 min early'), findsOneWidget);
      expect(find.text('Not enough timings'), findsOneWidget);
      expect(find.text('Not estimated'), findsOneWidget);
      expect(find.textContaining('About'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('extra forecast delay is never labelled as recovered time', (
    tester,
  ) async {
    final now = DateTime.now().toUtc();
    await tester.pumpWidget(
      arrivalWidget(
        stop(
          now: now,
          method: 'inference',
          reason: recoveryReason(futureRecovery: 0, futureDelay: 6),
        ),
        evidence(
          observed: now.subtract(const Duration(seconds: 30)).toIso8601String(),
        ),
      ),
    );
    expect(find.text('Possible extra delay by Kandra (KND)'), findsOneWidget);
    expect(find.text('About 6 min more'), findsOneWidget);
    expect(find.text('Estimate only; the delay may change'), findsOneWidget);
    expect(find.textContaining('has not been recovered yet'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('early trains and same-stop recovery use clear timing labels', (
    tester,
  ) async {
    final now = DateTime.now().toUtc();
    final reason = recoveryReason(
      status: 'early',
      current: -5,
      recovered: 2,
      futureRecovery: 0,
      futureDelay: 0,
    );
    (reason['timing'] as Map)['recovery_from_station'] = 'Lalru';
    await tester.pumpWidget(
      arrivalWidget(
        stop(now: now, delay: -3, method: 'inference', reason: reason),
        evidence(
          observed: now.subtract(const Duration(seconds: 30)).toIso8601String(),
        ),
      ),
    );
    expect(find.text('5 min early'), findsOneWidget);
    expect(find.text('During the stop at Lalru'), findsOneWidget);
    expect(find.text('No delay to recover'), findsOneWidget);
    expect(find.text('About 0 min'), findsNothing);
    expect(
      find.textContaining('Arrival timing can still change'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
