import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/train_models.dart';
import '../../core/services/train_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/passenger_components.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  final _number = TextEditingController();
  final _form = GlobalKey<FormState>();
  Station? _from;
  Station? _to;
  TrainSearchPage? _results;
  String? _error;
  bool _busy = false;
  bool _submitted = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    _request++;
    WidgetsBinding.instance.removeObserver(this);
    _number.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _submitted) {
      _search(page: _results?.page ?? 1);
    }
  }

  void _openTrain() {
    if (_form.currentState!.validate()) {
      context.push('/trains/${_number.text.trim()}');
    }
  }

  Future<void> _pick(bool origin) async {
    final station = await showDialog<Station>(
      context: context,
      builder: (_) => _StationPicker(
        title: origin ? 'Origin station' : 'Destination station',
      ),
    );
    if (!mounted || station == null) return;
    setState(() {
      _request++;
      if (origin) {
        _from = station;
      } else {
        _to = station;
      }
      _results = null;
      _error = null;
      _submitted = false;
    });
  }

  Future<void> _search({int page = 1}) async {
    if (_busy || _from == null || _to == null) return;
    if (_from!.code == _to!.code) {
      setState(
        () => _error = 'Choose different origin and destination stations.',
      );
      return;
    }
    final request = ++_request;
    setState(() {
      _busy = true;
      _submitted = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(trainRepositoryProvider)
          .searchTrains(_from!.code, _to!.code, page: page);
      if (!mounted || request != _request) return;
      setState(() {
        _busy = false;
        if (result.isSuccess) {
          _results = result.data;
        } else {
          _error = result.errorMessage ?? 'Unable to load trains.';
        }
      });
    } catch (_) {
      if (mounted && request == _request) {
        setState(() {
          _busy = false;
          _error = 'Unable to load trains. Please retry.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Row(
        children: [
          Icon(Icons.train_rounded, color: AppColors.brandBlue),
          SizedBox(width: 10),
          Expanded(child: Text('SIH ETA')),
        ],
      ),
    ),
    body: RefreshIndicator(
      onRefresh: () => _search(page: _results?.page ?? 1),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'YOUR JOURNEY, CLEARER',
                  style: TextStyle(
                    color: AppColors.brandBlue,
                    fontSize: 11,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Find your train',
                  style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Check the latest available status, station timings and arrival information.',
                  style: TextStyle(color: AppColors.mutedSteel, height: 1.5),
                ),
                const SizedBox(height: 24),
                PassengerCard(
                  child: Form(
                    key: _form,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Have a train number?',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          key: const Key('train-number'),
                          controller: _number,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.search,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(5),
                          ],
                          decoration: const InputDecoration(
                            labelText: '5-digit train number',
                            hintText: 'Enter train number',
                            prefixIcon: Icon(Icons.search),
                          ),
                          validator: (value) =>
                              RegExp(r'^\d{5}$').hasMatch(value?.trim() ?? '')
                              ? null
                              : 'Enter a valid 5-digit train number.',
                          onFieldSubmitted: (_) => _openTrain(),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            key: const Key('find-train'),
                            onPressed: _openTrain,
                            icon: const Icon(Icons.arrow_forward),
                            label: const Text('View train status'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SectionTitle('Find a route'),
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Find trains starting and ending at your selected stations.',
                    style: TextStyle(color: AppColors.mutedSteel, height: 1.5),
                  ),
                ),
                PassengerCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      OutlinedButton.icon(
                        key: const Key('origin-picker'),
                        onPressed: _busy ? null : () => _pick(true),
                        icon: const Icon(Icons.trip_origin),
                        label: Text(
                          _from?.label ?? 'Choose origin station',
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        key: const Key('destination-picker'),
                        onPressed: _busy ? null : () => _pick(false),
                        icon: const Icon(Icons.location_on_outlined),
                        label: Text(
                          _to?.label ?? 'Choose destination station',
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        key: const Key('search-trains'),
                        onPressed: _busy || _from == null || _to == null
                            ? null
                            : () => _search(),
                        icon: const Icon(Icons.search),
                        label: Text(_busy ? 'Searching…' : 'Search trains'),
                      ),
                    ],
                  ),
                ),
                if (_busy)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: LinearProgressIndicator(),
                  ),
                if (_error != null)
                  MessagePanel(
                    message:
                        '${_error!}${_results == null ? '' : ' Showing previous results; they may be out of date.'}',
                    onRetry: _busy
                        ? null
                        : () => _search(page: _results?.page ?? 1),
                  ),
                if (_results != null) ...[
                  const SectionTitle('Train services'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      DataTag(sourceLabel(_results!.source)),
                      DataTag(
                        '${_results!.total} results · page ${_results!.page}',
                      ),
                      const DataTag('Scheduled services'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_results!.trains.isEmpty)
                    const MessagePanel(
                      message:
                          'No trains match these endpoints. Try another origin or destination.',
                      icon: Icons.search_off,
                    ),
                  for (final train in _results!.trains)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () =>
                            context.push('/trains/${train.trainNumber}'),
                        child: PassengerCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                train.trainNumber,
                                style: const TextStyle(
                                  color: AppColors.brandBlue,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                train.trainName,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${train.origin?.label ?? 'Origin unavailable'} → ${train.destination?.label ?? 'Destination unavailable'}',
                                style: const TextStyle(
                                  color: AppColors.mutedSteel,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 16,
                                runSpacing: 8,
                                children: [
                                  Text(
                                    'Departs ${displayTime(train.departureTime)}',
                                  ),
                                  Text(
                                    'Arrives ${displayTime(train.arrivalTime)}',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'View status & arrival information →',
                                style: TextStyle(color: AppColors.brandBlue),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  Wrap(
                    spacing: 12,
                    children: [
                      if (_results!.page > 1)
                        OutlinedButton(
                          onPressed: _busy
                              ? null
                              : () => _search(page: _results!.page - 1),
                          child: const Text('Previous page'),
                        ),
                      if (_results!.hasNext)
                        OutlinedButton(
                          onPressed: _busy
                              ? null
                              : () => _search(page: _results!.page + 1),
                          child: const Text('Next page'),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class _StationPicker extends ConsumerStatefulWidget {
  final String title;
  const _StationPicker({required this.title});
  @override
  ConsumerState<_StationPicker> createState() => _StationPickerState();
}

class _StationPickerState extends ConsumerState<_StationPicker> {
  Timer? _debounce;
  String _query = '';
  List<Station> _stations = [];
  String? _error;
  bool _loading = false;
  bool _searched = false;
  int _request = 0;

  void _changed(String value) {
    _query = value.trim();
    _debounce?.cancel();
    _request++;
    setState(() {
      _stations = [];
      _error = null;
      _searched = false;
      _loading = false;
    });
    if (_query.length >= 2) {
      _debounce = Timer(const Duration(milliseconds: 350), _lookup);
    }
  }

  Future<void> _lookup() async {
    if (_query.length < 2) return;
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(trainRepositoryProvider)
          .searchStations(_query);
      if (!mounted || request != _request) return;
      setState(() {
        _loading = false;
        _searched = true;
        _stations = result.data ?? [];
        _error = result.isSuccess
            ? null
            : result.errorMessage ?? 'Station search failed.';
      });
    } catch (_) {
      if (mounted && request == _request) {
        setState(() {
          _loading = false;
          _error = 'Station search failed. Please retry.';
        });
      }
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _request++;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.title),
    content: SizedBox(
      width: 420,
      height: 320,
      child: Column(
        children: [
          TextField(
            key: const Key('station-query'),
            autofocus: true,
            onChanged: _changed,
            decoration: const InputDecoration(
              labelText: 'Station name or code',
              hintText: 'At least 2 characters',
            ),
          ),
          const SizedBox(height: 12),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: _error != null
                ? ListView(
                    children: [
                      MessagePanel(message: _error!, onRetry: _lookup),
                    ],
                  )
                : _stations.isNotEmpty
                ? ListView.builder(
                    itemCount: _stations.length,
                    itemBuilder: (context, i) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(_stations[i].name),
                      subtitle: Text(_stations[i].code),
                      onTap: () => Navigator.pop(context, _stations[i]),
                    ),
                  )
                : Center(
                    child: Text(
                      _searched
                          ? 'No matching stations.'
                          : 'Search the station directory.',
                      style: const TextStyle(color: AppColors.mutedSteel),
                    ),
                  ),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
    ],
  );
}
