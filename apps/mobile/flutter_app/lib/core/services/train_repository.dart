import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/train_models.dart';
import '../network/api_client.dart';

class JourneyResult {
  final ApiResult<TrainStatus> status;
  final ApiResult<ETAModel> eta;
  final DateTime fetchedAt;
  JourneyResult(this.status, this.eta, this.fetchedAt);
}

abstract class TrainRepository {
  Future<ApiResult<List<Station>>> searchStations(String query);
  Future<ApiResult<TrainSearchPage>> searchTrains(
    String from,
    String to, {
    int page = 1,
  });
  Future<JourneyResult> getJourney(String trainNumber, {String? date});
}

class ApiTrainRepository implements TrainRepository {
  final ApiClient _client;
  final String baseUrl;
  ApiTrainRepository({ApiClient? client, String? baseUrl})
    : _client = client ?? ApiClient(),
      baseUrl = (baseUrl ?? ApiConfig.v1BaseUrl).replaceFirst(
        RegExp(r'/+$'),
        '',
      );
  void close() => _client.close();
  String _url(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl/$path').replace(queryParameters: query).toString();

  @override
  Future<ApiResult<List<Station>>> searchStations(String query) => _client.get(
    _url('stations/search', {'q': query.trim()}),
    (json) {
      if (jsonObject(json)['data_source'] != 'database') throw const FormatException('Station source unverified');
      return jsonList(jsonObject(json)['results'], Station.fromJson);
    },
  );

  @override
  Future<ApiResult<TrainSearchPage>> searchTrains(
    String from,
    String to, {
    int page = 1,
  }) => _client.get(
    _url('trains/search', {
      'from_station': from.trim().toUpperCase(),
      'to_station': to.trim().toUpperCase(),
      'page': '$page',
      'limit': '20',
    }),
    (json) => TrainSearchPage.fromJson(jsonObject(json)),
  );

  @override
  Future<JourneyResult> getJourney(String trainNumber, {String? date}) async {
    final id = Uri.encodeComponent(trainNumber.trim());
    var status = await _client.get(
      _url('trains/$id/status', date == null ? null : {'date': date}),
      (json) => TrainStatus.fromJson(jsonObject(json)),
    );
    if (date != null &&
        status.data?.date != null &&
        status.data!.date != date) {
      status = ApiResult.error(
        'No status was returned for the selected journey date.',
      );
    }
    final journeyDate = date ?? status.data?.date;
    var eta = await _client.get(
      _url(
        'trains/$id/eta',
        journeyDate == null ? null : {'date': journeyDate},
      ),
      (json) => ETAModel.fromJson(jsonObject(json)),
    );
    if (eta.data != null &&
        ((journeyDate != null &&
                eta.data!.date != null &&
                eta.data!.date != journeyDate) ||
            eta.data!.trainNumber != trainNumber.trim())) {
      eta = ApiResult.error(
        'Prediction belongs to a different journey. Please refresh.',
      );
    }
    if (status.data != null && status.data!.trainNumber != trainNumber.trim()) {
      return JourneyResult(
        ApiResult.error('Unexpected train in server response.'),
        eta,
        DateTime.now(),
      );
    }
    return JourneyResult(status, eta, DateTime.now());
  }
}

final trainRepositoryProvider = Provider<TrainRepository>((ref) {
  final repository = ApiTrainRepository();
  ref.onDispose(repository.close);
  return repository;
});
