import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sih_eta/core/models/train_models.dart';
import 'package:sih_eta/core/models/journey_view.dart';
import 'package:sih_eta/core/network/api_client.dart';
import 'package:sih_eta/core/services/train_repository.dart';
import 'package:sih_eta/shared/widgets/passenger_components.dart';
import 'fixtures.dart';

void main() {
  test('versioned contracts and journey date are used end to end', () async {
    final paths = <Uri>[];
    final client = ApiClient(client: MockClient((request) async {
      paths.add(request.url);
      final path = request.url.path;
      return http.Response(jsonEncode(path.endsWith('/status') ? statusJson() :
        path.endsWith('/eta') ? etaJson(method: 'stored') :
        path.endsWith('/stations/search') ? {'results': [station('AAA')]} : searchJson()), 200);
    }));
    final repo = ApiTrainRepository(client: client, baseUrl: 'http://localhost/api/v1/');
    addTearDown(repo.close);
    final stations = await repo.searchStations(' aa ');
    expect(stations.data!.single.code, 'AAA');
    final search = await repo.searchTrains('aaa', 'ccc');
    expect(search.data!.trains.single.origin!.code, 'AAA');
    expect(search.data!.trains.single.arrivalTime, '10:00');
    final journey = await repo.getJourney('12301');
    expect(journey.status.data!.currentStation!.code, 'BBB');
    expect(journey.eta.data!.method, 'stored');
    expect(paths.every((url) => url.path.startsWith('/api/v1/')), isTrue);
    expect(paths.last.queryParameters['date'], '2026-09-20');
    expect(paths[1].queryParameters['from_station'], 'AAA');
  });

  test('route order, observed progress and unique predictions are merged', () {
    final status = TrainStatus.fromJson(statusJson());
    final entries = journeyStops(status, ETAModel.fromJson(etaJson(method: 'stored')));
    expect(entries.map((e) => e.stop.station!.code), ['AAA', 'BBB', 'CCC']);
    expect(entries.map((e) => e.stage), [StopStage.passed, StopStage.current, StopStage.upcoming]);
    expect(entries.last.prediction!.predictedArrival, '10:12');
    expect(journeyStops(status, ETAModel.fromJson(etaJson())).last.prediction, isNull);
    expect(journeyStops(status, ETAModel.fromJson(etaJson(method: 'stored', date: '2026-09-19')))
      .last.prediction, isNull);
  });

  test('duplicate stations and missing progress are not guessed', () {
    final json = statusJson();
    json['current_station'] = null;
    json['last_known_location'] = null;
    json['route'] = [
      {'station': station('CCC'), 'has_departed': false},
      {'station': station('CCC'), 'has_departed': false},
    ];
    final entries = journeyStops(TrainStatus.fromJson(json), ETAModel.fromJson(etaJson(method: 'stored')));
    expect(entries.every((e) => e.stage == StopStage.unknown && e.prediction == null), isTrue);
    expect(TrainStatus.fromJson(json).delay, isNull);
  });

  test('legacy summary payload is a contract error, never blank success', () async {
    final client = ApiClient(client: MockClient((_) async => http.Response(
      '{"train_id":"12301","predicted_eta":"10:00","current_delay":12}', 200)));
    addTearDown(client.close);
    final result = await client.get('http://localhost/eta',
      (value) => ETAModel.fromJson(jsonObject(value)));
    expect(result.status, ApiResultStatus.error);
    expect(result.data, isNull);
  });

  for (final code in [404, 422, 500]) {
    test('HTTP $code remains distinguishable from an empty result', () async {
      final client = ApiClient(client: MockClient((_) async => http.Response(
        code == 404 ? '{"error":"NOT_FOUND","message":"Train not found"}' : '{}', code)));
      addTearDown(client.close);
      final result = await client.get('http://localhost/test', (j) => j);
      expect(result.status, code == 404 ? ApiResultStatus.notFound :
        code == 422 ? ApiResultStatus.invalid : ApiResultStatus.error);
      expect(result.errorMessage, isNotEmpty);
    });
  }

  test('timeout and transport failures report unavailable connection', () async {
    for (final timeout in [true, false]) {
      final client = ApiClient(timeout: const Duration(milliseconds: 2),
        client: MockClient((_) async {
          if (timeout) {
            await Future<void>.delayed(const Duration(milliseconds: 20));
            return http.Response('{}', 200);
          }
          throw http.ClientException('Offline');
        }));
      final result = await client.get('http://localhost/test', (j) => j);
      expect(result.status, ApiResultStatus.offline);
      client.close();
    }
  });

  test('empty search and missing provenance do not mean live', () {
    final json = searchJson(empty: true)..remove('data_source');
    final page = TrainSearchPage.fromJson(json);
    expect(page.trains, isEmpty);
    expect(sourceLabel(page.source), 'Source unverified');
    expect(parseDataState(null), ApiDataState.unknown);
  });

  test('status failure still permits station estimates; date mismatch is rejected', () async {
    var failStatus = true;
    final client = ApiClient(client: MockClient((request) async {
      if (request.url.path.endsWith('/status')) {
        return failStatus ? http.Response('{}', 503) : http.Response(jsonEncode(statusJson()), 200);
      }
      return http.Response(jsonEncode(etaJson(date: '2026-09-19')), 200);
    }));
    final repo = ApiTrainRepository(client: client, baseUrl: 'http://localhost/api/v1');
    addTearDown(repo.close);
    final partial = await repo.getJourney('12301');
    expect(partial.status.isSuccess, isFalse);
    expect(partial.eta.isSuccess, isTrue);
    failStatus = false;
    final mismatch = await repo.getJourney('12301');
    expect(mismatch.eta.status, ApiResultStatus.error);
  });

  test('time formatting preserves time-only values and converts zoned timestamps to IST', () {
    expect(displayTime(null), 'Unavailable');
    expect(displayTime('not-a-time'), 'Unavailable');
    expect(displayTime('23:55:00'), '23:55');
    expect(displayTime('2026-09-20T20:00:00Z'), '21 Sep, 01:30 IST');
    expect(delayLabel(-4), '4 min early');
    expect(delayLabel(null), 'Delay unavailable');
  });
}
