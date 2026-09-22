import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart' show StateProvider;
import 'package:go_router/go_router.dart';
import '../../core/models/train_models.dart';
import '../../core/services/preferences.dart';
import '../explore/explore_screen.dart';
import '../../core/services/train_repository.dart';
import '../../shared/widgets/passenger_components.dart';

final _stationSuggestions = StateProvider<List<Station>>(
  (ref) => const [
    Station(code: 'NDLS', name: 'New Delhi'),
    Station(code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus'),
    Station(code: 'HWH', name: 'Howrah Junction'),
    Station(code: 'MAS', name: 'MGR Chennai Central'),
  ],
);
final _stationSearchCache = Provider((ref) => <String, List<Station>>{});

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _number = TextEditingController();
  final _form = GlobalKey<FormState>();
  Station? _from, _to, _trackedStation;
  DateTime? _travelDate;
  String? _error;

  @override
  void dispose() {
    _number.dispose();
    super.dispose();
  }

  Future<Station?> _choose(String title) => showDialog<Station>(
    context: context,
    builder: (_) => _StationPicker(title: title),
  );

  Future<void> _pick(bool origin) async {
    final station = await _choose(
      origin ? 'Origin station' : 'Destination station',
    );
    if (!mounted || station == null) return;
    setState(() {
      if (origin) {
        _from = station;
      } else {
        _to = station;
      }
      _error = null;
    });
  }

  void _search() {
    if (_from == null || _to == null) return;
    if (_from!.code == _to!.code) {
      setState(
        () => _error = 'Choose different origin and destination stations.',
      );
      return;
    }
    FocusScope.of(context).unfocus();
    context.push(
      Uri(
        path: '/search',
        queryParameters: {
          'from': _from!.code,
          'to': _to!.code,
          'fromName': _from!.name,
          'toName': _to!.name,
          if (_travelDate != null) 'date': formatSearchDate(_travelDate!),
        },
      ).toString(),
    );
  }

  void _openTrain() {
    if (!_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    ref.read(historyProvider.notifier).add(_number.text.trim());
    context.push(
      Uri(
        path: '/trains/${_number.text.trim()}',
        queryParameters: _trackedStation == null
            ? null
            : {'station': _trackedStation!.code},
      ).toString(),
    );
  }

  Widget _stationField({
    required String keyName,
    required String label,
    required Station? station,
    required IconData icon,
    required VoidCallback onTap,
  }) => ListTile(
    key: Key(keyName),
    onTap: onTap,
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
    title: Text(label, style: Theme.of(context).textTheme.labelMedium),
    subtitle: Text(
      station?.label ?? 'City or station · e.g., Delhi',
      style: TextStyle(
        fontSize: 15,
        fontWeight: station == null ? FontWeight.normal : FontWeight.w600,
      ),
    ),
    trailing: const Icon(Icons.chevron_right, size: 20),
  );

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.train_rounded, color: colors.primary),
            const SizedBox(width: 10),
            const Text('SIH ETA'),
          ],
        ),
      ),
      bottomNavigationBar: const AppNavigation(selected: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Find your train',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Plan a journey. Follow your train.',
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
                const SizedBox(height: 22),
                PassengerCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.alt_route,
                            size: 20,
                            color: colors.primary,
                          ),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Find a route',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _stationField(
                        keyName: 'origin-picker',
                        label: 'From',
                        station: _from,
                        icon: Icons.trip_origin,
                        onTap: () => _pick(true),
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: Divider(color: colors.outlineVariant),
                          ),
                          IconButton(
                            tooltip: 'Swap stations',
                            icon: const Icon(Icons.swap_vert),
                            onPressed: () => setState(() {
                              final previous = _from;
                              _from = _to;
                              _to = previous;
                              _error = null;
                            }),
                          ),
                        ],
                      ),
                      _stationField(
                        keyName: 'destination-picker',
                        label: 'To',
                        station: _to,
                        icon: Icons.location_on_outlined,
                        onTap: () => _pick(false),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          TextButton.icon(
                            key: const Key('travel-date'),
                            icon: const Icon(
                              Icons.calendar_today_outlined,
                              size: 18,
                            ),
                            label: Text(
                              _travelDate == null
                                  ? 'Choose travel date'
                                  : formatSearchDate(_travelDate!),
                            ),
                            onPressed: () async {
                              final now = DateTime.now();
                              final today = DateTime(
                                now.year,
                                now.month,
                                now.day,
                              );
                              final selected = await showDatePicker(
                                context: context,
                                initialDate:
                                    _travelDate != null &&
                                        !_travelDate!.isBefore(today)
                                    ? _travelDate
                                    : today,
                                firstDate: today,
                                lastDate: today.add(const Duration(days: 120)),
                              );
                              if (mounted && selected != null) {
                                setState(() => _travelDate = selected);
                              }
                            },
                          ),
                          if (_travelDate != null)
                            IconButton(
                              tooltip: 'Clear travel date',
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () =>
                                  setState(() => _travelDate = null),
                            ),
                        ],
                      ),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            _error!,
                            style: TextStyle(color: colors.error),
                          ),
                        ),
                      FilledButton.icon(
                        key: const Key('search-trains'),
                        onPressed: _from == null || _to == null
                            ? null
                            : _search,
                        icon: const Icon(Icons.search),
                        label: const Text('Search trains'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                PassengerCard(
                  child: Form(
                    key: _form,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Have a train number?',
                          style: TextStyle(
                            fontSize: 18,
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
                            hintText: 'e.g., 12423',
                            prefixIcon: Icon(Icons.train_outlined),
                          ),
                          validator: (value) =>
                              RegExp(r'^\d{5}$').hasMatch(value?.trim() ?? '')
                              ? null
                              : 'Enter a valid 5-digit train number.',
                          onFieldSubmitted: (_) => _openTrain(),
                        ),
                        const SizedBox(height: 10),
                        TextButton.icon(
                          key: const Key('track-station-picker'),
                          icon: const Icon(
                            Icons.location_on_outlined,
                            size: 18,
                          ),
                          label: Text(
                            _trackedStation?.label ??
                                'Station to track · e.g., Delhi (optional)',
                          ),
                          onPressed: () async {
                            final station = await _choose('Station to track');
                            if (mounted && station != null) {
                              setState(() => _trackedStation = station);
                            }
                          },
                        ),
                        if (_trackedStation != null)
                          TextButton(
                            onPressed: () =>
                                setState(() => _trackedStation = null),
                            child: const Text('Clear station'),
                          ),
                        const SizedBox(height: 6),
                        FilledButton.tonalIcon(
                          key: const Key('find-train'),
                          onPressed: _openTrain,
                          icon: const Icon(Icons.arrow_forward),
                          label: const Text('View train status'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      avatar: const Icon(Icons.manage_search, size: 18),
                      label: const Text('Search train name'),
                      onPressed: () => context.push('/directory'),
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.departure_board, size: 18),
                      label: const Text('Station board'),
                      onPressed: () => context.push('/board'),
                    ),
                  ],
                ),
                if (ref.watch(historyProvider).isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'Recently opened',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final n in ref.watch(historyProvider))
                        ActionChip(
                          avatar: const Icon(Icons.history, size: 16),
                          label: Text(n),
                          onPressed: () => context.push('/trains/$n'),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
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

  @override
  void initState() {
    super.initState();
    _stations = ref.read(_stationSuggestions);
  }

  void _changed(String value) {
    _query = value.trim();
    _debounce?.cancel();
    _request++;
    setState(() {
      _stations = _query.isEmpty
          ? ref.read(_stationSuggestions)
          : ref.read(_stationSearchCache)[_query.toLowerCase()] ??
                ref
                    .read(_stationSuggestions)
                    .where(
                      (s) =>
                          s.label.toLowerCase().contains(_query.toLowerCase()),
                    )
                    .toList();
      _error = null;
      _searched = false;
      _loading = false;
    });
    if (_query.length >= 2) {
      _debounce = Timer(Duration(milliseconds: 200), _lookup);
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
      if (result.isSuccess) {
        final cache = ref.read(_stationSearchCache);
        if (cache.length >= 30) cache.remove(cache.keys.first);
        cache[_query.toLowerCase()] = result.data ?? [];
      }
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
            key: Key('station-query'),
            autofocus: true,
            onChanged: _changed,
            decoration: InputDecoration(
              labelText: 'Station name or code',
              hintText: 'e.g., Delhi or NDLS',
              helperText: 'Enter a city, station name or code',
            ),
          ),
          SizedBox(height: 12),
          if (_query.isEmpty)
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Recent & common stations'),
            ),
          if (_loading) LinearProgressIndicator(),
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
                      onTap: () {
                        final selected = _stations[i];
                        ref.read(_stationSuggestions.notifier).state = [
                          selected,
                          ...ref
                              .read(_stationSuggestions)
                              .where((s) => s.code != selected.code),
                        ].take(8).toList();
                        Navigator.pop(context, selected);
                      },
                    ),
                  )
                : Center(
                    child: Text(
                      _searched
                          ? 'No matching stations.'
                          : 'Search the station directory.',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text('Cancel'),
      ),
    ],
  );
}
