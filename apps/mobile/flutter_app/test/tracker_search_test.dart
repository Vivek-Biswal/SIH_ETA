import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/core/models/journey_view.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/shared/widgets/station_timeline.dart';
import 'passenger_flow_test.dart'
    show TestRepository, pumpApp, phone, revealTap;
import 'fixtures.dart';

JourneyStop entry(
  String code, {
  String? a = '10:00',
  String? d = '10:00',
  StopStage stage = StopStage.upcoming,
}) => JourneyStop(
  RouteStop.fromJson({
    'station': {'code': code, 'name': code},
    'scheduled_arrival': a,
    'scheduled_departure': d,
  }),
  null,
  stage,
);

void main() {
  test(
    'passing classification keeps unknown times and genuine dwell visible',
    () {
      expect(isPassingEntry(entry('A')), isTrue);
      expect(isPassingEntry(entry('A', d: '10:00:00')), isTrue);
      expect(isPassingEntry(entry('A', d: '10:05')), isFalse);
      expect(isPassingEntry(entry('A', a: null)), isFalse);
      expect(isPassingEntry(entry('A', a: 'bad', d: 'bad')), isFalse);
    },
  );

  test('departed current station retains the train marker', () {
    final data = statusJson();
    data['route'][1]['has_departed'] = true;
    expect(
      journeyStops(TrainStatus.fromJson(data), null)[1].stage,
      StopStage.current,
    );
  });

  testWidgets(
    'intermediate stations expand and collapse; marker follows updates',
    (tester) async {
      Future<void> render(String current) => tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: StationTimeline(
                stops: [
                  entry('A', d: '10:05'),
                  entry('B'),
                  entry(
                    'C',
                    stage: current == 'C'
                        ? StopStage.current
                        : StopStage.passed,
                  ),
                  entry(
                    'D',
                    stage: current == 'D'
                        ? StopStage.current
                        : StopStage.upcoming,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await render('C');
      expect(find.text('B'), findsNothing);
      expect(find.byKey(const ValueKey('train-marker-C')), findsOneWidget);
      await tester.tap(find.byKey(const Key('toggle-intermediate')));
      await tester.pumpAndSettle();
      expect(find.text('B'), findsNWidgets(2));
      await tester.tap(find.byKey(const Key('toggle-intermediate')));
      await tester.pumpAndSettle();
      expect(find.text('B'), findsNothing);
      await render('D');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('train-marker-D')), findsOneWidget);
      expect(find.byKey(const ValueKey('train-marker-C')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('route comes first and both station fields suggest immediately', (
    tester,
  ) async {
    phone(tester);
    await pumpApp(tester, TestRepository());
    expect(
      tester.getTopLeft(find.text('Find a route')).dy,
      lessThan(tester.getTopLeft(find.text('Have a train number?')).dy),
    );
    for (final key in ['origin-picker', 'track-station-picker']) {
      await revealTap(tester, find.byKey(Key(key)));
      expect(find.text('New Delhi'), findsOneWidget);
      expect(find.text('Recent & common stations'), findsOneWidget);
      expect(find.text('e.g., Delhi or NDLS'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull);
  });
}
