import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sih_eta/core/models/network_insights.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/network_insights_repository.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/features/train_details/train_details_screen.dart';
import 'package:sih_eta/main.dart';
import 'passenger_flow_test.dart' show TestRepository, revealTap, phone;

Map<String, dynamic> networkFixture({String query = ''}) => {
  'data_source': 'historical',
  'live_available': false,
  'period_start': '2024-09-01',
  'period_end': '2024-09-30',
  'query': query,
  'station_count': 1,
  'interaction_count': 3,
  'high_risk_count': 1,
  'stations': [
    {
      'station': 'NDLS',
      'risk': 'high',
      'interactions': 3,
      'flagged_interactions': 1,
      'risk_score': .57,
      'bottleneck_score': .6,
      'mean_source_delay_minutes': 28,
      'mean_gap_minutes': 8,
    },
  ],
  'interactions': [
    {
      'station': 'NDLS',
      'service_date': '2024-09-17',
      'source_train': '12301',
      'target_train': '12423',
      'risk': 'critical',
      'risk_score': .61,
      'source_delay_minutes': 30,
      'target_delay_minutes': 10,
      'gap_minutes': 5,
    },
  ],
};

class TestNetworkRepository implements NetworkInsightsRepository {
  final queries = <String>[];
  bool offline = false;
  @override
  Future<ApiResult<NetworkInsights>> getInsights({String query = ''}) async {
    queries.add(query);
    if (offline) return ApiResult.error('Connection unavailable');
    return ApiResult.success(
      NetworkInsights.fromJson(networkFixture(query: query)),
    );
  }
}

void main() {
  test(
    'network endpoint parses object, sends query, requires dated historical provenance',
    () async {
      Uri? requested;
      final client = ApiClient(
        client: MockClient((request) async {
          requested = request.url;
          return http.Response(jsonEncode(networkFixture()), 200);
        }),
      );
      final repo = ApiNetworkInsightsRepository(
        client: client,
        baseUrl: 'https://example.test/api/v1',
      );
      addTearDown(repo.close);
      final result = await repo.getInsights(query: ' ndls ');
      expect(requested!.path, '/api/v1/network/insights');
      expect(requested!.queryParameters['q'], 'NDLS');
      expect(result.data!.interactionCount, 3);
      expect(result.data!.stations.single.meanDelay, 28);
      expect(
        () => NetworkInsights.fromJson(
          networkFixture()..['data_source'] = 'live',
        ),
        throwsFormatException,
      );
      expect(
        () => NetworkInsights.fromJson(
          networkFixture()..['live_available'] = true,
        ),
        throwsFormatException,
      );
    },
  );

  test(
    'undeployed network endpoint is unavailable, not an empty healthy network',
    () async {
      final repo = ApiNetworkInsightsRepository(
        client: ApiClient(
          client: MockClient((_) async => http.Response('{}', 404)),
        ),
        baseUrl: 'https://example.test/api/v1',
      );
      addTearDown(repo.close);
      expect((await repo.getInsights()).status, ApiResultStatus.unavailable);
    },
  );

  testWidgets('network search, station drilldown and latest-train navigation', (
    tester,
  ) async {
    final repo = TestNetworkRepository();
    final router = createAppRouter(initialLocation: '/network');
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          networkInsightsRepositoryProvider.overrideWithValue(repo),
          trainRepositoryProvider.overrideWithValue(TestRepository()),
        ],
        child: SihEtaMobileApp(router: router, enableOnboarding: false),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Historical analysis'), findsOneWidget);
    expect(find.textContaining('2024-09-01 to 2024-09-30'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Explore recorded interactions'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await revealTap(tester, find.text('Explore recorded interactions'));
    expect(repo.queries.last, 'NDLS');
    await tester.scrollUntilVisible(
      find.text('Train 12301'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await revealTap(tester, find.text('Train 12301'));
    final screen = tester.widget<TrainDetailsScreen>(
      find.byType(TrainDetailsScreen),
    );
    expect(screen.trainNumber, '12301');
    expect(screen.stationCode, 'NDLS');
    expect(
      screen.journeyDate,
      isNull,
    ); // Historic event is never presented as today's trip.
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'network retains old analysis on refresh failure and clears it for new query',
    (tester) async {
      phone(tester, scale: 2);
      final repo = TestNetworkRepository();
      final router = createAppRouter(initialLocation: '/network');
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            networkInsightsRepositoryProvider.overrideWithValue(repo),
          ],
          child: SihEtaMobileApp(router: router, enableOnboarding: false),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      repo.offline = true;
      await tester.tap(find.byKey(const Key('refresh-network')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.textContaining('Showing the last fetched analysis'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.textContaining('Showing the last fetched analysis'),
        findsOneWidget,
      );
      await tester.ensureVisible(find.byKey(const Key('network-query')));
      await tester.enterText(find.byKey(const Key('network-query')), 'CNB');
      await revealTap(tester, find.text('Search network'));
      expect(repo.queries.last, 'CNB');
      expect(
        find.textContaining('Showing the last fetched analysis'),
        findsNothing,
      );
      expect(find.text('NDLS'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
