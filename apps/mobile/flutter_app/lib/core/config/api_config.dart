class ApiConfig {
  // Base host URL (e.g. 'https://sih-eta-api.onrender.com' or 'http://10.0.2.2:8000')
  static const String rootUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8000',
  );

  // Unversioned compatibility API endpoints (/api)
  static const String baseUrl = bool.hasEnvironment('API_URL')
      ? String.fromEnvironment('API_URL')
      : '$rootUrl/api';

  // Versioned standard API endpoints (/api/v1)
  static const String v1BaseUrl = bool.hasEnvironment('API_URL_V1')
      ? String.fromEnvironment('API_URL_V1')
      : '$rootUrl/api/v1';
}


