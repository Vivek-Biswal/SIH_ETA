import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/train_models.dart';
import 'mock_mobile_data.dart';

abstract class TrainRepository {
  Future<List<TrainSummary>> getRecentTrains();
  Future<ETAModel> getTrainETA(String trainNumber);
}

class MockTrainRepository implements TrainRepository {
  @override
  Future<List<TrainSummary>> getRecentTrains() async {
    await Future.delayed(const Duration(milliseconds: 150));
    return MockMobileData.sampleTrains;
  }

  @override
  Future<ETAModel> getTrainETA(String trainNumber) async {
    await Future.delayed(const Duration(milliseconds: 250));
    return MockMobileData.eta12301;
  }
}

final trainRepositoryProvider = Provider<TrainRepository>((ref) {
  return MockTrainRepository();
});

final recentTrainsProvider = FutureProvider<List<TrainSummary>>((ref) {
  final repo = ref.watch(trainRepositoryProvider);
  return repo.getRecentTrains();
});

final trainEtaProvider = FutureProvider.family<ETAModel, String>((ref, trainNo) {
  final repo = ref.watch(trainRepositoryProvider);
  return repo.getTrainETA(trainNo);
});
