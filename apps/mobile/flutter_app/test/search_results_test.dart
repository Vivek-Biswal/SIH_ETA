import 'package:flutter_test/flutter_test.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'fixtures.dart';
import 'passenger_flow_test.dart' show TestRepository, pumpApp, revealTap;

class PagedRepository extends TestRepository {
  bool fail = true;
  final requests = <(String, String, int, DateTime?)>[];
  @override
  Future<ApiResult<TrainSearchPage>> searchTrains(
    String from,
    String to, {
    int page = 1,
    DateTime? date,
  }) async {
    requests.add((from, to, page, date));
    if (fail) return ApiResult.error('Connection interrupted');
    final json = searchJson()
      ..['page'] = page
      ..['total'] = 21;
    return ApiResult.success(TrainSearchPage.fromJson(json));
  }
}

void main() {
  testWidgets(
    'results retry and pagination preserve endpoints and selected date',
    (tester) async {
      final repo = PagedRepository();
      await pumpApp(
        tester,
        repo,
        location: '/search?from=AAA&to=CCC&date=2026-09-23',
      );
      expect(find.text('Connection interrupted'), findsOneWidget);
      repo.fail = false;
      await revealTap(tester, find.text('Retry'));
      expect(find.text('Test Express'), findsOneWidget);
      await revealTap(tester, find.text('Next page'));
      expect(repo.requests.last, ('AAA', 'CCC', 2, DateTime(2026, 9, 23)));
      await revealTap(tester, find.text('Previous page'));
      expect(repo.requests.last, ('AAA', 'CCC', 1, DateTime(2026, 9, 23)));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('invalid direct search does not call backend', (tester) async {
    final repo = PagedRepository();
    await pumpApp(tester, repo, location: '/search');
    expect(repo.requests, isEmpty);
    expect(find.textContaining('Choose different origin'), findsOneWidget);
    expect(find.byTooltip('Back to search'), findsOneWidget);
  });
}
