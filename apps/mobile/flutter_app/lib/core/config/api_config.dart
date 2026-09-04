class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:8000/api', // Note: using /api for new compat endpoints
  );
  
  static const String v1BaseUrl = String.fromEnvironment(
    'API_URL_V1',
    defaultValue: 'http://localhost:8000/api/v1', // Using /api/v1 for existing endpoints
  );
}
