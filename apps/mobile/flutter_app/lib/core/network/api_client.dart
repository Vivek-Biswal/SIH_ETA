import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/train_models.dart';

enum ApiResultStatus {
  loading,
  success,
  empty,
  error,
  offline,
  stale,
  unavailable,
  notFound,
  invalid,
}

class ApiResult<T> {
  final ApiResultStatus status;
  final T? data;
  final String? errorMessage;
  final ApiDataState dataState;
  const ApiResult._(
    this.status, {
    this.data,
    this.errorMessage,
    this.dataState = ApiDataState.unknown,
  });
  factory ApiResult.success(
    T data, {
    ApiDataState dataState = ApiDataState.unknown,
  }) => ApiResult._(ApiResultStatus.success, data: data, dataState: dataState);
  factory ApiResult.error(
    String message, {
    ApiResultStatus status = ApiResultStatus.error,
    ApiDataState dataState = ApiDataState.error,
  }) => ApiResult._(status, errorMessage: message, dataState: dataState);
  factory ApiResult.empty({ApiDataState dataState = ApiDataState.unknown}) =>
      ApiResult._(ApiResultStatus.empty, dataState: dataState);
  bool get isSuccess => status == ApiResultStatus.success;
}

class ApiClient {
  final http.Client _client;
  final Duration timeout;
  ApiClient({http.Client? client, this.timeout = const Duration(seconds: 12)})
    : _client = client ?? http.Client();
  void close() => _client.close();

  Future<ApiResult<T>> get<T>(String url, T Function(dynamic) fromJson) =>
      _request(() => _client.get(Uri.parse(url)), fromJson);
  Future<ApiResult<T>> post<T>(
    String url,
    Map<String, dynamic> body,
    T Function(dynamic) fromJson,
  ) => _request(
    () => _client.post(
      Uri.parse(url),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    ),
    fromJson,
  );

  Future<ApiResult<T>> _request<T>(
    Future<http.Response> Function() send,
    T Function(dynamic) parse,
  ) async {
    try {
      final response = await send().timeout(timeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final status = switch (response.statusCode) {
          404 => ApiResultStatus.notFound,
          400 || 422 => ApiResultStatus.invalid,
          429 || 502 || 503 || 504 => ApiResultStatus.unavailable,
          _ => ApiResultStatus.error,
        };
        // Server/provider error bodies can contain internal diagnostics. Keep
        // passenger guidance predictable, including for non-JSON proxy errors.
        return ApiResult.error(
          switch (status) {
            ApiResultStatus.notFound =>
              'No railway information was found for these details.',
            ApiResultStatus.invalid => 'Please check the search details.',
            ApiResultStatus.unavailable =>
              'Railway information is temporarily unavailable. Please try again shortly.',
            _ => 'The service could not complete this request. Please retry.',
          },
          status: status,
          dataState: status == ApiResultStatus.unavailable
              ? ApiDataState.unavailable
              : ApiDataState.error,
        );
      }
      try {
        final decoded = jsonDecode(response.body);
        if (decoded == null) throw const FormatException('Empty response');
        final source = decoded is Map
            ? decoded['data_source'] ?? decoded['data_state']
            : null;
        if (source == 'demo' || source == 'mock') {
          return ApiResult.error(
            'Live data unavailable. The connected service returned demonstration records, which are not shown.',
            status: ApiResultStatus.unavailable,
          );
        }
        return ApiResult.success(
          parse(decoded),
          dataState: parseDataState(source),
        );
      } catch (_) {
        return ApiResult.error(
          'The server returned an unexpected response. Please retry.',
        );
      }
    } on TimeoutException {
      return ApiResult.error(
        'The server took too long to respond. Please retry.',
        status: ApiResultStatus.offline,
      );
    } on http.ClientException {
      return ApiResult.error(
        'Cannot reach the server. Check your connection and retry.',
        status: ApiResultStatus.offline,
      );
    } catch (_) {
      return ApiResult.error(
        'Unable to make this request. Check the API configuration.',
      );
    }
  }
}
