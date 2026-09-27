import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/train_repository.dart';

import 'fixtures.dart';

void main() {
  ApiTrainRepository repository(
    Future<http.Response> Function(http.Request) handler,
  ) {
    final repo = ApiTrainRepository(
      client: ApiClient(client: MockClient(handler)),
      baseUrl: 'https://example.test/api/v1',
    );
    addTearDown(repo.close);
    return repo;
  }

  test('a different train cannot choose the ETA journey date', () async {
    final requests = <Uri>[];
    final repo = repository((request) async {
      requests.add(request.url);
      return http.Response(
        jsonEncode(
          request.url.path.endsWith('/status')
              ? statusJson(number: '99999', date: '2026-09-19')
              : etaJson(method: 'stored'),
        ),
        200,
      );
    });

    final result = await repo.getJourney('12301');

    expect(result.status.status, ApiResultStatus.error);
    expect(result.status.data, isNull);
    expect(requests.last.queryParameters.containsKey('date'), isFalse);
    expect(result.eta.data!.date, '2026-09-20');
  });

  for (final missingDate in <String?>[null, '']) {
    test(
      'a missing status date ($missingDate) cannot match an explicit date',
      () async {
        final requests = <Uri>[];
        final repo = repository((request) async {
          requests.add(request.url);
          return http.Response(
            jsonEncode(
              request.url.path.endsWith('/status')
                  ? statusJson(date: missingDate)
                  : etaJson(method: 'stored'),
            ),
            200,
          );
        });

        final result = await repo.getJourney('12301', date: '2026-09-20');

        expect(result.status.status, ApiResultStatus.error);
        expect(result.status.data, isNull);
        expect(requests.last.queryParameters['date'], '2026-09-20');
        expect(result.eta.isSuccess, isTrue);
      },
    );

    test(
      'a missing ETA date ($missingDate) cannot match the status journey',
      () async {
        final repo = repository(
          (request) async => http.Response(
            jsonEncode(
              request.url.path.endsWith('/status')
                  ? statusJson()
                  : etaJson(method: 'stored', date: missingDate),
            ),
            200,
          ),
        );

        final result = await repo.getJourney('12301');

        expect(result.status.isSuccess, isTrue);
        expect(result.eta.status, ApiResultStatus.error);
        expect(result.eta.data, isNull);
      },
    );
  }

  test(
    'two unknown journey dates cannot be combined as a valid journey',
    () async {
      final repo = repository(
        (request) async => http.Response(
          jsonEncode(
            request.url.path.endsWith('/status')
                ? statusJson(date: null)
                : etaJson(method: 'stored', date: null),
          ),
          200,
        ),
      );

      final result = await repo.getJourney('12301');

      expect(result.status.data, isNull);
      expect(result.eta.data, isNull);
    },
  );

  test(
    'an explicit date permits independent ETA when status is unavailable',
    () async {
      final repo = repository((request) async {
        if (request.url.path.endsWith('/status')) {
          return http.Response('{"detail":"Provider unavailable"}', 503);
        }
        expect(request.url.queryParameters['date'], '2026-09-20');
        return http.Response(jsonEncode(etaJson(method: 'stored')), 200);
      });

      final result = await repo.getJourney('12301', date: '2026-09-20');

      expect(result.status.status, ApiResultStatus.unavailable);
      expect(result.eta.isSuccess, isTrue);
    },
  );

  test(
    'an ETA for another train is rejected even with the correct date',
    () async {
      final repo = repository(
        (request) async => http.Response(
          jsonEncode(
            request.url.path.endsWith('/status')
                ? statusJson()
                : (etaJson(method: 'stored')..['train_number'] = '99999'),
          ),
          200,
        ),
      );

      final result = await repo.getJourney('12301', date: '2026-09-20');

      expect(result.status.isSuccess, isTrue);
      expect(result.eta.data, isNull);
    },
  );

  for (final statusCode in [429, 502, 503, 504]) {
    test(
      'HTTP $statusCode is service unavailability without server internals',
      () async {
        final client = ApiClient(
          client: MockClient(
            (_) async => http.Response(
              '{"message":"Private provider diagnostic","detail":"Internal host"}',
              statusCode,
            ),
          ),
        );
        addTearDown(client.close);

        final result = await client.get(
          'https://example.test/status',
          (json) => json,
        );

        expect(result.status, ApiResultStatus.unavailable);
        expect(result.dataState, ApiDataState.unavailable);
        expect(result.errorMessage, contains('temporarily unavailable'));
        expect(result.errorMessage, isNot(contains('Private provider')));
        expect(result.errorMessage, isNot(contains('Internal host')));
      },
    );
  }

  test(
    'a failed connection remains distinguishable from an unavailable service',
    () async {
      final client = ApiClient(
        client: MockClient((_) async {
          throw http.ClientException('Network unreachable');
        }),
      );
      addTearDown(client.close);

      final result = await client.get(
        'https://example.test/status',
        (json) => json,
      );

      expect(result.status, ApiResultStatus.offline);
      expect(result.errorMessage, contains('connection'));
    },
  );

  for (final source in ['database', 'demo', 'mock', 'unknown']) {
    test('station directory preserves provenance checks for $source', () async {
      final repo = repository(
        (_) async => http.Response(
          jsonEncode({
            'data_source': source,
            'results': [station('NDLS')],
          }),
          200,
        ),
      );

      final result = await repo.searchStations('Delhi');

      if (source == 'database') {
        expect(result.data!.single.code, 'NDLS');
      } else {
        expect(result.data, isNull);
        expect(result.isSuccess, isFalse);
        if (source == 'demo' || source == 'mock') {
          expect(result.status, ApiResultStatus.unavailable);
        }
      }
    });
  }
}
