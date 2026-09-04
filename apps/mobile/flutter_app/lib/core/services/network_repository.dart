import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/network_models.dart';
import '../network/api_client.dart';
import '../config/api_config.dart';

abstract class NetworkRepository {
  Future<ApiResult<List<NetworkZoneStatus>>> getNetworkStatus();
  Future<ApiResult<List<BottleneckModel>>> getBottlenecks();
  Future<ApiResult<ScenarioModel>> runWhatIf(WhatIfRequest request);
  Future<ApiResult<ScenarioModel>> runSimulation(SimulationRequest request);
  Future<ApiResult<ScenarioModel>> getScenario(String scenarioId);
}

class ApiNetworkRepository implements NetworkRepository {
  final ApiClient _client;

  ApiNetworkRepository({ApiClient? client}) : _client = client ?? ApiClient();

  @override
  Future<ApiResult<List<NetworkZoneStatus>>> getNetworkStatus() {
    return _client.get(
      '${ApiConfig.v1BaseUrl}/network/status',
      (json) => (json as List).map((e) => NetworkZoneStatus.fromJson(e)).toList(),
    );
  }

  @override
  Future<ApiResult<List<BottleneckModel>>> getBottlenecks() {
    return _client.get(
      '${ApiConfig.baseUrl}/network/bottlenecks',
      (json) => (json as List).map((e) => BottleneckModel.fromJson(e)).toList(),
    );
  }

  @override
  Future<ApiResult<ScenarioModel>> runWhatIf(WhatIfRequest request) {
    return _client.post(
      '${ApiConfig.baseUrl}/what-if',
      request.toJson(),
      (json) => ScenarioModel.fromJson(json),
    );
  }

  @override
  Future<ApiResult<ScenarioModel>> runSimulation(SimulationRequest request) {
    return _client.post(
      '${ApiConfig.baseUrl}/simulation',
      request.toJson(),
      (json) => ScenarioModel.fromJson(json),
    );
  }

  @override
  Future<ApiResult<ScenarioModel>> getScenario(String scenarioId) {
    return _client.get(
      '${ApiConfig.baseUrl}/scenarios/$scenarioId',
      (json) => ScenarioModel.fromJson(json),
    );
  }
}

final networkRepositoryProvider = Provider<NetworkRepository>((ref) {
  return ApiNetworkRepository();
});

final networkStatusProvider = FutureProvider<ApiResult<List<NetworkZoneStatus>>>((ref) {
  return ref.watch(networkRepositoryProvider).getNetworkStatus();
});

final bottlenecksProvider = FutureProvider<ApiResult<List<BottleneckModel>>>((ref) {
  return ref.watch(networkRepositoryProvider).getBottlenecks();
});

final scenarioProvider = FutureProvider.family<ApiResult<ScenarioModel>, String>((ref, scenarioId) {
  return ref.watch(networkRepositoryProvider).getScenario(scenarioId);
});
