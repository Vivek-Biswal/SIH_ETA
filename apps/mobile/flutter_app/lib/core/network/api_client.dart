import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/train_models.dart'; // For ApiDataState

enum ApiResultStatus { loading, success, empty, error, offline, stale, unavailable }

class ApiResult<T> {
  final ApiResultStatus status;
  final T? data;
  final String? errorMessage;
  final ApiDataState dataState;

  const ApiResult._({
    required this.status,
    this.data,
    this.errorMessage,
    this.dataState = ApiDataState.live,
  });

  factory ApiResult.success(T data, {ApiDataState dataState = ApiDataState.live}) {
    return ApiResult._(status: ApiResultStatus.success, data: data, dataState: dataState);
  }

  factory ApiResult.error(String message, {ApiDataState dataState = ApiDataState.error}) {
    return ApiResult._(status: ApiResultStatus.error, errorMessage: message, dataState: dataState);
  }

  factory ApiResult.empty({ApiDataState dataState = ApiDataState.live}) {
    return ApiResult._(status: ApiResultStatus.empty, dataState: dataState);
  }
}

class ApiClient {
  final http.Client _client = http.Client();

  Future<ApiResult<T>> get<T>(
    String url,
    T Function(dynamic json) fromJson,
  ) async {
    try {
      final response = await _client.get(Uri.parse(url)).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
        if (decoded == null) {
          return ApiResult.empty();
        }
        
        // Extract data_state if present in the response
        ApiDataState state = ApiDataState.live;
        if (decoded is Map<String, dynamic> && decoded.containsKey('data_state')) {
          final stateStr = decoded['data_state']?.toString().toLowerCase();
          if (stateStr == 'mock') state = ApiDataState.mock;
          if (stateStr == 'unavailable') state = ApiDataState.unavailable;
        }

        return ApiResult.success(fromJson(decoded), dataState: state);
      } else if (response.statusCode == 404) {
        return ApiResult.empty();
      } else {
        return ApiResult.error('HTTP Error: ${response.statusCode}');
      }
    } catch (e) {
      return ApiResult.error('Network Error: $e', dataState: ApiDataState.error);
    }
  }

  Future<ApiResult<T>> post<T>(
    String url,
    Map<String, dynamic> body,
    T Function(dynamic json) fromJson,
  ) async {
    try {
      final response = await _client.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = json.decode(response.body);
        return ApiResult.success(fromJson(decoded));
      } else {
        return ApiResult.error('HTTP Error: ${response.statusCode}');
      }
    } catch (e) {
      return ApiResult.error('Network Error: $e', dataState: ApiDataState.error);
    }
  }
}
