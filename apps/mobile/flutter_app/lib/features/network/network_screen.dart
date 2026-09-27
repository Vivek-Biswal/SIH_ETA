import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/network_insights.dart';
import '../../core/services/network_insights_repository.dart';
import '../../shared/widgets/passenger_components.dart';
import '../explore/explore_screen.dart';

class NetworkScreen extends ConsumerStatefulWidget {
  const NetworkScreen({super.key});
  @override
  ConsumerState<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends ConsumerState<NetworkScreen>
    with WidgetsBindingObserver {
  final _search = TextEditingController();
  NetworkInsights? _data;
  String _query = '';
  String? _error;
  DateTime? _fetchedAt;
  bool _busy = false;
  bool _showInteractions = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (_active) _load();
    });
  }

  bool get _active =>
      mounted &&
      ModalRoute.of(context)?.isCurrent == true &&
      (WidgetsBinding.instance.lifecycleState == null ||
          WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed);

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _active) _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _search.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load({String? query}) async {
    if (_busy) return;
    setState(() {
      if (query != null && query != _query) {
        _data = null;
        _fetchedAt = null;
        _query = query;
      }
      _error = null;
      _busy = true;
    });
    try {
      final result = await ref
          .read(networkInsightsRepositoryProvider)
          .getInsights(query: _query);
      if (!mounted) return;
      setState(() {
        _busy = false;
        if (result.isSuccess) {
          _data = result.data;
          _fetchedAt = DateTime.now();
        } else {
          _error =
              result.errorMessage ?? 'Network analysis could not be loaded.';
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Network analysis could not be refreshed. Please retry.';
        });
      }
    }
  }

  void _find() {
    FocusScope.of(context).unfocus();
    _load(query: _search.text.trim().toUpperCase());
  }

  void _station(String code) {
    _search.text = code;
    setState(() => _showInteractions = true);
    _load(query: code);
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Network intelligence'),
        actions: [
          IconButton(
            key: const Key('refresh-network'),
            tooltip: 'Refresh network analysis',
            onPressed: _busy ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      bottomNavigationBar: const AppNavigation(selected: 2),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Understand delay patterns',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            const Text(
              'Explore where trains have faced bottlenecks and where delays may have affected following trains.',
              style: TextStyle(height: 1.5),
            ),
            const SizedBox(height: 18),
            PassengerCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.history, color: colors.primary),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Historical analysis',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    data == null
                        ? 'The observation period is shown when the analysis loads.'
                        : 'Records from ${data.periodStart} to ${data.periodEnd}',
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'These are recorded patterns, not current disruptions. Check your train for its latest status.',
                    style: TextStyle(height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            TextField(
              key: const Key('network-query'),
              controller: _search,
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.search,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[a-zA-Z0-9 ]')),
                LengthLimitingTextInputFormatter(20),
              ],
              onSubmitted: (_) {
                if (!_busy) _find();
              },
              decoration: const InputDecoration(
                labelText: 'Station code or train number',
                hintText: 'e.g., NDLS or 12423',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                FilledButton(
                  onPressed: _busy ? null : _find,
                  child: const Text('Search network'),
                ),
                if (_query.isNotEmpty)
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _search.clear();
                            _load(query: '');
                          },
                    child: const Text('Show all'),
                  ),
              ],
            ),
            if (_busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: LinearProgressIndicator(),
              ),
            if (_error != null)
              MessagePanel(
                message:
                    '${_error!}${data == null ? '' : ' Showing the last fetched analysis; it may be outdated.'}',
                onRetry: _busy ? null : _load,
              ),
            if (data != null) ...[
              const SizedBox(height: 16),
              Text(
                data.query.isEmpty
                    ? 'Across the recorded network'
                    : 'Matches for ${data.query}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  DataTag('${data.stationCount} stations'),
                  DataTag('${data.interactionCount} recorded interactions'),
                  DataTag('${data.highRiskCount} high / critical scores'),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Last fetched: ${displayTime(_fetchedAt?.toUtc().toIso8601String())}',
                style: const TextStyle(fontSize: 12),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Station bottlenecks'),
                    selected: !_showInteractions,
                    onSelected: (_) =>
                        setState(() => _showInteractions = false),
                  ),
                  ChoiceChip(
                    label: const Text('Delay propagation'),
                    selected: _showInteractions,
                    onSelected: (_) => setState(() => _showInteractions = true),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (!_showInteractions) ...[
                Text(
                  'Top ${data.stations.length} of ${data.stationCount} matching stations · ranked by bottleneck score',
                  style: const TextStyle(fontSize: 12),
                ),
                for (final station in data.stations)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: PassengerCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            station.station,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          _RiskLabel(
                            risk: station.risk,
                            score: station.riskScore,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${station.interactions} recorded train interactions',
                          ),
                          Text(
                            'Average preceding-train delay: ${station.meanDelay.toStringAsFixed(1)} min',
                          ),
                          Text(
                            'Average gap between trains: ${station.meanGap.toStringAsFixed(1)} min',
                          ),
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _station(station.station),
                            icon: const Icon(Icons.alt_route),
                            label: const Text('Explore recorded interactions'),
                          ),
                        ],
                      ),
                    ),
                  ),
              ] else ...[
                const Text(
                  'Delay propagation means one delayed train may affect another nearby service. A model score alone does not prove causation.',
                  style: TextStyle(height: 1.5),
                ),
                const SizedBox(height: 8),
                Text(
                  'Top ${data.interactions.length} of ${data.interactionCount} matching records · ranked by model score',
                  style: const TextStyle(fontSize: 12),
                ),
                for (final record in data.interactions)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: PassengerCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            '${record.station} · ${record.serviceDate}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${record.sourceTrain} → ${record.targetTrain}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _RiskLabel(
                            risk: record.risk,
                            score: record.riskScore,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Recorded delays: ${record.sourceDelay.toStringAsFixed(0)} min → ${record.targetDelay.toStringAsFixed(0)} min',
                          ),
                          Text('Gap: ${record.gap.toStringAsFixed(0)} min'),
                          const SizedBox(height: 10),
                          const Text(
                            'Check latest status (a different journey):',
                            style: TextStyle(fontSize: 12),
                          ),
                          Wrap(
                            spacing: 8,
                            children: [
                              for (final number in {
                                record.sourceTrain,
                                record.targetTrain,
                              })
                                OutlinedButton(
                                  onPressed: () => context.push(
                                    Uri(
                                      path: '/trains/$number',
                                      queryParameters: {
                                        'station': record.station,
                                      },
                                    ).toString(),
                                  ),
                                  child: Text('Train $number'),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
              if (data.stationCount == 0 && data.interactionCount == 0)
                const MessagePanel(
                  message:
                      'No matching records in this analysis. Try another station code or train number.',
                ),
              const SizedBox(height: 20),
              const Text(
                'Scores describe modelled risk in the historical dataset. They are not calibrated probabilities, live railway alerts or forecasts for your current trip.',
                style: TextStyle(fontSize: 12, height: 1.5),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _RiskLabel extends StatelessWidget {
  final String risk;
  final double score;
  const _RiskLabel({required this.risk, required this.score});
  @override
  Widget build(BuildContext context) => Text(
    '${risk[0].toUpperCase()}${risk.substring(1)} historical risk · model score ${score.toStringAsFixed(3)}',
    style: TextStyle(
      fontWeight: FontWeight.w600,
      color: risk == 'critical' || risk == 'high'
          ? Theme.of(context).colorScheme.error
          : Theme.of(context).colorScheme.primary,
    ),
  );
}
