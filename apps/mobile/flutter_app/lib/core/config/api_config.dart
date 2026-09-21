class ApiConfig {
  static const rootUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://sih-eta-backend-a819.onrender.com',
  );
  static String _trim(String value) => value.replaceFirst(RegExp(r'/+$'), '');
  static String get baseUrl => const bool.hasEnvironment('API_URL')
      ? _trim(const String.fromEnvironment('API_URL'))
      : '${_trim(rootUrl)}/api';
  static String get v1BaseUrl => const bool.hasEnvironment('API_URL_V1')
      ? _trim(const String.fromEnvironment('API_URL_V1'))
      : '${_trim(rootUrl)}/api/v1';
}
