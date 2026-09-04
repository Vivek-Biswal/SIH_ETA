import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/train_models.dart';
import '../network/api_client.dart';
import '../config/api_config.dart';

abstract class TrainRepository {
  Future<ApiResult<List<TrainSummary>>> getRecentTrains();
  Future<ApiResult<ETAModel>> getTrainETA(String trainNumber);
  Future<ApiResult<DelayDnaModel>> getDelayDna(String trainNumber);
  Future<ApiResult<RecoveryModel>> getRecovery(String trainNumber);
  Future<ApiResult<PropagationModel>> getPropagation(String trainNumber);
}

class ApiTrainRepository implements TrainRepository {
  final ApiClient _client;

  ApiTrainRepository({ApiClient? client}) : _client = client ?? ApiClient();

  @override
  Future<ApiResult<List<TrainSummary>>> getRecentTrains() {
    return _client.get(
      '${ApiConfig.v1BaseUrl}/trains/search?from_station=NDLS&to_station=BCT',
      (json) {
        if (json is Map<String, dynamic> && json.containsKey('trains')) {
          return (json['trains'] as List).map((e) => TrainSummary.fromJson(e)).toList();
        }
        return (json as List).map((e) => TrainSummary.fromJson(e)).toList();
      }
    );
  }

  @override
  Future<ApiResult<ETAModel>> getTrainETA(String trainNumber) {
    return _client.get(
      '${ApiConfig.baseUrl}/trains/$trainNumber/eta',
      (json) => ETAModel.fromJson(json),
    );
  }

  @override
  Future<ApiResult<DelayDnaModel>> getDelayDna(String trainNumber) {
    return _client.get(
      '${ApiConfig.baseUrl}/trains/$trainNumber/delay-dna',
      (json) => DelayDnaModel.fromJson(json),
    );
  }

  @override
  Future<ApiResult<RecoveryModel>> getRecovery(String trainNumber) {
    return _client.get(
      '${ApiConfig.baseUrl}/trains/$trainNumber/recovery',
      (json) => RecoveryModel.fromJson(json),
    );
  }

  @override
  Future<ApiResult<PropagationModel>> getPropagation(String trainNumber) {
    return _client.get(
      '${ApiConfig.baseUrl}/trains/$trainNumber/propagation',
      (json) => PropagationModel.fromJson(json),
    );
  }
}

final trainRepositoryProvider = Provider<TrainRepository>((ref) {
  return ApiTrainRepository();
});

final recentTrainsProvider = FutureProvider<ApiResult<List<TrainSummary>>>((ref) {
  return ref.watch(trainRepositoryProvider).getRecentTrains();
});

final trainEtaProvider = FutureProvider.family<ApiResult<ETAModel>, String>((ref, trainNo) {
  return ref.watch(trainRepositoryProvider).getTrainETA(trainNo);
});

final delayDnaProvider = FutureProvider.family<ApiResult<DelayDnaModel>, String>((ref, trainNo) {
  return ref.watch(trainRepositoryProvider).getDelayDna(trainNo);
});

final recoveryProvider = FutureProvider.family<ApiResult<RecoveryModel>, String>((ref, trainNo) {
  return ref.watch(trainRepositoryProvider).getRecovery(trainNo);
});

final propagationProvider = FutureProvider.family<ApiResult<PropagationModel>, String>((ref, trainNo) {
  return ref.watch(trainRepositoryProvider).getPropagation(trainNo);
});
