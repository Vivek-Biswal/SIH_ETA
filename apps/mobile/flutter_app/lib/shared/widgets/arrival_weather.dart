import 'package:flutter/material.dart';
import '../../core/config/api_config.dart';
import '../../core/network/api_client.dart';
import 'passenger_components.dart';

class ArrivalWeather extends StatefulWidget {
  final String number, date, station;
  final String? predicted;
  const ArrivalWeather({
    super.key,
    required this.number,
    required this.date,
    required this.station,
    this.predicted,
  });
  @override
  State<ArrivalWeather> createState() => _ArrivalWeatherState();
}

class _ArrivalWeatherState extends State<ArrivalWeather> {
  final _client = ApiClient();
  Map<String, dynamic>? _data;
  String? _error;
  int _allowance = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final query = Uri(
      queryParameters: {'date': widget.date, 'station_code': widget.station},
    ).query;
    final result = await _client.get(
      '${ApiConfig.v1BaseUrl}/trains/${widget.number}/weather?$query',
      (value) {
        if (value is! Map<String, dynamic> ||
            value['train_number'] != widget.number ||
            value['date'] != widget.date ||
            value['station_code'] != widget.station) {
          throw const FormatException('Weather does not match this journey');
        }
        return value;
      },
    );
    if (mounted) {
      setState(() {
        _data = result.data;
        _error = result.isSuccess
            ? null
            : 'Weather outlook is temporarily unavailable. Your ETA is unchanged.';
      });
    }
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final predicted = DateTime.tryParse(widget.predicted ?? '');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Weather around your arrival · ${widget.station}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            if (_error != null)
              Text(_error!)
            else if (_data == null)
              const Text('Checking OpenWeather forecast…')
            else ...[
              if (_data!['available'] == true) ...[
                Text(
                  '${_data!['condition']} · ${_data!['temperature_c']}°C',
                  style: const TextStyle(fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  'Rain: ${_data!['rain_mm_3h']} mm / 3 hours · Wind: ${_data!['wind_kmh']} km/h',
                ),
                const SizedBox(height: 8),
                Text(
                  'OpenWeather · Forecast: ${displayTime(_data!['forecast_at'] as String?)}\nAround ${_data!['arrival_basis']} arrival · Retrieved ${displayTime(_data!['retrieved_at'] as String?)}',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
              const SizedBox(height: 12),
              Text(_data!['message'] as String? ?? 'Weather unavailable.'),
              if (_data!['available'] == true && predicted != null) ...[
                const Divider(height: 28),
                DropdownButtonFormField<int>(
                  value: _allowance,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Optional weather planning allowance',
                  ),
                  items: [0, 15, 30, 60]
                      .map(
                        (v) => DropdownMenuItem(
                          value: v,
                          child: Text('$v min extra'),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _allowance = v ?? 0),
                ),
                const SizedBox(height: 12),
                Text(
                  'Your planning time: ${displayTime(predicted.add(Duration(minutes: _allowance)).toIso8601String())}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const Text(
                  'Train ETA plus your allowance. This does not change the predicted arrival.',
                  style: TextStyle(fontSize: 12),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
