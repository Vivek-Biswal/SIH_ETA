import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/api_config.dart';
import '../models/network_insights.dart';
import '../models/train_models.dart';
import '../network/api_client.dart';

abstract class NetworkInsightsRepository {
  Future<ApiResult<NetworkInsights>> getInsights({String query = ''});
}

class ApiNetworkInsightsRepository implements NetworkInsightsRepository {
  final ApiClient _client;
  final String baseUrl;
  ApiNetworkInsightsRepository({ApiClient? client, String? baseUrl})
    : _client = client ?? ApiClient(),
      baseUrl = baseUrl ?? ApiConfig.v1BaseUrl;
  void close() => _client.close();

  @override
  Future<ApiResult<NetworkInsights>> getInsights({String query = ''}) async {
    final result = await _client.get(
      Uri.parse('$baseUrl/network/insights')
          .replace(
            queryParameters: {'q': query.trim().toUpperCase(), 'limit': '50'},
          )
          .toString(),
      (json) => NetworkInsights.fromJson(jsonObject(json)),
    );
    if (result.status == ApiResultStatus.notFound) {
      return ApiResult.error(
        'Network analysis is not available on the connected service yet. Please retry later.',
        status: ApiResultStatus.unavailable,
      );
    }
    return result;
  }
}

final networkInsightsRepositoryProvider = Provider<NetworkInsightsRepository>((
  ref,
) {
  final repository = ApiNetworkInsightsRepository();
  ref.onDispose(repository.close);
  return repository;
});
