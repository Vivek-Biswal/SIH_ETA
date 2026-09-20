import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:http/http.dart' as http;
import 'package:sih_eta/main.dart';
import 'package:sih_eta/core/config/api_config.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/train_repository.dart';

class DisconnectableClient extends http.BaseClient {
  final _delegate = http.Client();
  bool disconnected = false;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    if (disconnected) throw http.ClientException('Test disconnect');
    return _delegate.send(request);
  }
  @override
  void close() => _delegate.close();
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('passenger flow against FastAPI, refresh, disconnect and recovery', (tester) async {
    final transport = DisconnectableClient();
    final repository = ApiTrainRepository(client: ApiClient(client: transport),
      baseUrl: ApiConfig.v1BaseUrl);
    final router = createAppRouter();
    addTearDown(repository.close);
    addTearDown(router.dispose);
    await tester.pumpWidget(ProviderScope(
      overrides: [trainRepositoryProvider.overrideWithValue(repository)],
      child: SihEtaMobileApp(router: router)));
    await tester.pumpAndSettle();

    Future<void> tap(Finder finder) async {
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      await tester.tap(finder);
      await tester.pumpAndSettle(const Duration(milliseconds: 200));
    }
    for (final pair in [('origin-picker', 'HWH'), ('destination-picker', 'NDLS')]) {
      await tap(find.byKey(Key(pair.$1)));
      await tester.enterText(find.byKey(const Key('station-query')), pair.$2);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle(const Duration(milliseconds: 200));
      await tap(find.text(pair.$2).last);
    }
    await tap(find.byKey(const Key('search-trains')));
    expect(find.text('Howrah Rajdhani Express'), findsOneWidget);
    await tap(find.text('12301').last);
    expect(find.text('Howrah Rajdhani Express'), findsOneWidget);
    expect(find.text('Demo data'), findsOneWidget);
    expect(find.text('Schedule only · adjusted ETA unavailable'), findsOneWidget);
    expect(find.text('Stations on your route'), findsOneWidget);
    expect(find.text('Last known station'), findsOneWidget);

    transport.disconnected = true;
    await tap(find.byKey(const Key('refresh-journey')));
    expect(find.textContaining('Showing last fetched status'), findsOneWidget);
    expect(find.text('Howrah Rajdhani Express'), findsOneWidget);
    transport.disconnected = false;
    await tap(find.byKey(const Key('refresh-journey')));
    expect(find.textContaining('Showing last fetched status'), findsNothing);

    await tap(find.byTooltip('Back to search'));
    await tester.ensureVisible(find.byKey(const Key('train-number')));
    await tester.enterText(find.byKey(const Key('train-number')), '99999');
    await tap(find.byKey(const Key('find-train')));
    expect(find.textContaining('Train 99999 not found'), findsWidgets);
    await tap(find.byTooltip('Back to search'));
    await tester.ensureVisible(find.byKey(const Key('train-number')));
    await tester.enterText(find.byKey(const Key('train-number')), '12301');
    await tap(find.byKey(const Key('find-train')));
    expect(find.text('Howrah Rajdhani Express'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}