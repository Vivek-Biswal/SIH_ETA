Map<String, dynamic> station(String code) => {'code': code, 'name': '$code station'};
Map<String, dynamic> statusJson({String number = '12301', String? date = '2026-09-20'}) => {
  'train_number': number, 'train_name': 'Test Express', 'date': date,
  'data_source': 'demo', 'current_station': station('BBB'),
  'last_known_location': {'station': station('BBB'), 'delay_minutes': 12,
    'updated_at': '2026-09-20T05:00:00Z'},
  'overall_delay_minutes': 12, 'status': 'running',
  'route': [
    {'station': station('AAA'), 'scheduled_departure': '08:00',
      'actual_departure': '08:12', 'has_departed': true},
    {'station': station('BBB'), 'scheduled_arrival': '09:00',
      'actual_arrival': '09:12', 'has_departed': false},
    {'station': station('CCC'), 'scheduled_arrival': '10:00',
      'has_departed': false, 'platform': null},
  ],
};
Map<String, dynamic> etaJson({String method = 'schedule_only', String? date = '2026-09-20'}) => {
  'train_number': '12301', 'train_name': 'Test Express', 'date': date,
  'data_source': 'demo', 'prediction_method': method, 'model_version': 'baseline-v0',
  'prediction_generated_at': null, 'overall_delay_minutes': 12, 'confidence_score': 0.5,
  'remaining_stations': [
    {'station': station('CCC'), 'scheduled_arrival': '10:00',
      'predicted_arrival': method == 'schedule_only' ? '10:00' : '10:12',
      'predicted_delay_minutes': 12, 'prediction_confidence': 0.5},
    {'station': station('BBB'), 'scheduled_arrival': '09:00',
      'predicted_arrival': '09:12', 'predicted_delay_minutes': 12},
  ],
  'delay_factors': [],
};
Map<String, dynamic> searchJson({bool empty = false}) => {
  'total': empty ? 0 : 1, 'page': 1, 'limit': 20, 'data_source': 'demo',
  'trains': empty ? [] : [{
    'train_number': '12301', 'train_name': 'Test Express',
    'from_station': station('AAA'), 'to_station': station('CCC'),
    'departure_time': '08:00', 'arrival_time': '10:00',
    'days_of_run': null, 'train_type': 'Express',
  }],
};