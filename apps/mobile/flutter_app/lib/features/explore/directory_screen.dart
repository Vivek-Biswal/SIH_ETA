import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/api_config.dart';
import '../../core/network/api_client.dart';
import '../../core/models/train_models.dart';
import '../../shared/widgets/passenger_components.dart';

class DirectoryScreen extends StatefulWidget {
  final bool board;
  const DirectoryScreen({super.key, this.board = false});
  @override
  State<DirectoryScreen> createState() => _DirectoryScreenState();
}

class _DirectoryScreenState extends State<DirectoryScreen> {
  final _query = TextEditingController();
  final _client = ApiClient();
  List<Map<String, dynamic>> _rows = [];
  String? _error;
  bool _busy = false, _searched = false;
  Future<void> _search() async {
    final query = _query.text.trim();
    if (query.length < 2) {
      setState(() => _error = 'Enter at least 2 characters.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _rows = [];
    });
    final url = widget.board
        ? '${ApiConfig.v1BaseUrl}/passenger/departures/${Uri.encodeComponent(query.toUpperCase())}'
        : Uri.parse(
            '${ApiConfig.v1BaseUrl}/passenger/lookup',
          ).replace(queryParameters: {'q': query}).toString();
    final result = await _client.get(
      url,
      (j) => jsonList(jsonObject(j)['results'], (row) => row),
    );
    if (!mounted) return;
    setState(() {
      _busy = false;
      _searched = true;
      _rows = result.data ?? [];
      _error = result.isSuccess
          ? null
          : result.status == ApiResultStatus.notFound
          ? 'This tool is unavailable on the connected service. Please try again later.'
          : result.errorMessage;
    });
  }

  @override
  void dispose() {
    _query.dispose();
    _client.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.board ? 'Station departure board' : 'Train directory'),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          widget.board ? 'Scheduled departures' : 'Find a service',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        Text(
          widget.board
              ? 'Timetable entries only. Live departures, platforms and date-specific running confirmations are unavailable.'
              : 'Search the connected railway directory by train name or number.',
          style: const TextStyle(height: 1.5),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _query,
          onSubmitted: (_) => _busy ? null : _search(),
          decoration: InputDecoration(
            labelText: widget.board ? 'Station code' : 'Train name or number',
            prefixIcon: const Icon(Icons.search),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _busy ? null : _search,
          child: Text(_busy ? 'Searching…' : 'Search'),
        ),
        if (_busy)
          const Padding(
            padding: EdgeInsets.all(20),
            child: LinearProgressIndicator(),
          ),
        if (_error != null)
          MessagePanel(message: _error!, onRetry: _busy ? null : _search),
        if (_searched && !_busy && _error == null && _rows.isEmpty)
          const MessagePanel(
            message: 'No matching records in the connected directory.',
          ),
        for (final row in _rows)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: PassengerCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  '${row['train_number']} · ${row['train_name'] ?? 'Train service'}',
                ),
                subtitle: Text(
                  widget.board
                      ? 'Scheduled departure ${displayTime(row['scheduled_departure'] as String?)}'
                      : 'View available journey information',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/trains/${row['train_number']}'),
              ),
            ),
          ),
      ],
    ),
  );
}
