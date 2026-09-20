import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/train_models.dart';
import '../../core/models/journey_view.dart';
import '../../core/network/api_client.dart';
import '../../core/services/train_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/eta_display.dart';
import '../../shared/widgets/station_timeline.dart';
import '../../shared/widgets/passenger_components.dart';

class TrainDetailsScreen extends ConsumerStatefulWidget {
  final String trainNumber;
  const TrainDetailsScreen({super.key, required this.trainNumber});
  @override
  ConsumerState<TrainDetailsScreen> createState() => _TrainDetailsScreenState();
}

class _TrainDetailsScreenState extends ConsumerState<TrainDetailsScreen>
    with WidgetsBindingObserver {
  TrainStatus? _status;
  ETAModel? _eta;
  String? _statusError;
  String? _etaError;
  DateTime? _fetchedAt;
  bool _loading = true;
  bool _busy = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void didUpdateWidget(TrainDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trainNumber != widget.trainNumber) {
      _request++;
      _status = null;
      _eta = null;
      _fetchedAt = null;
      _statusError = null;
      _etaError = null;
      _busy = false;
      _loading = true;
      _refresh();
    }
  }

  @override
  void dispose() {
    _request++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    if (_busy) return;
    if (!RegExp(r'^\d{5}$').hasMatch(widget.trainNumber)) {
      setState(() {
        _loading = false;
        _statusError = 'Enter a valid 5-digit train number.';
      });
      return;
    }
    final request = ++_request;
    setState(() => _busy = true);
    try {
      final result = await ref
          .read(trainRepositoryProvider)
          .getJourney(widget.trainNumber);
      if (!mounted || request != _request) return;
      setState(() {
        final freshStatus = result.status.data;
        final freshEta = result.eta.data;
        // Never retain data from a different journey during partial refresh.
        if (freshStatus != null && _eta?.date != freshStatus.date) _eta = null;
        if (freshEta != null && _status?.date != freshEta.date) _status = null;
        if (result.status.status == ApiResultStatus.notFound) _status = null;
        if (result.eta.status == ApiResultStatus.notFound) _eta = null;
        _status = freshStatus ?? _status;
        _eta = freshEta ?? _eta;
        _statusError = result.status.isSuccess
            ? null
            : result.status.errorMessage ?? 'Status is unavailable.';
        _etaError = result.eta.isSuccess
            ? null
            : result.eta.errorMessage ?? 'Arrival predictions are unavailable.';
        if (freshStatus != null || freshEta != null) {
          _fetchedAt = result.fetchedAt;
        }
        _loading = false;
        _busy = false;
      });
    } catch (_) {
      if (mounted && request == _request) {
        setState(() {
          _loading = false;
          _busy = false;
          _statusError = 'Unable to refresh. Check your connection and retry.';
          _etaError = 'Arrival information could not be refreshed.';
        });
      }
    }
  }

  bool get _observationOld {
    final observed = DateTime.tryParse(_status?.observedAt ?? '');
    return observed != null &&
        DateTime.now().difference(observed) > const Duration(minutes: 5);
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final eta = _eta;
    final stops = status == null ? <JourneyStop>[] : journeyStops(status, eta);
    final destination = stops.isEmpty ? null : stops.last;
    final progressKnown = stops.any((s) => s.stage != StopStage.unknown);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back to search',
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(
          'Train ${widget.trainNumber}',
          style: const TextStyle(fontFamily: 'monospace', fontSize: 18),
        ),
        actions: [
          IconButton(
            key: const Key('refresh-journey'),
            tooltip: 'Refresh train',
            onPressed: _busy ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 640),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_busy)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 16),
                            child: LinearProgressIndicator(),
                          ),
                        if (status != null || eta != null) ...[
                          Text(
                            status?.trainName ?? eta!.trainName,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              DataTag(
                                sourceLabel(status?.source ?? eta?.source),
                              ),
                              if (status?.date != null || eta?.date != null)
                                DataTag(
                                  'Journey: ${status?.date ?? eta?.date}',
                                ),
                              if (status != null && status.hasObservation)
                                DataTag(status.status.replaceAll('_', ' ')),
                              if (_observationOld)
                                const DataTag('Observation over 5 minutes old'),
                            ],
                          ),
                          if (eta != null &&
                              status != null &&
                              eta.source != status.source)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: DataTag('ETA: ${sourceLabel(eta.source)}'),
                            ),
                          const SizedBox(height: 12),
                          Text(
                            'Last fetched: ${_fetchedAt == null ? 'Unavailable' : displayTime(_fetchedAt!.toUtc().toIso8601String())}',
                            style: const TextStyle(
                              color: AppColors.mutedSteel,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Last observation: ${displayTime(status?.observedAt)}',
                            style: const TextStyle(
                              color: AppColors.mutedSteel,
                              fontSize: 12,
                            ),
                          ),
                          if (eta?.generatedAt != null)
                            Text(
                              'Prediction generated: ${displayTime(eta!.generatedAt)}',
                              style: const TextStyle(
                                color: AppColors.mutedSteel,
                                fontSize: 12,
                              ),
                            ),
                        ],
                        if (_statusError != null)
                          MessagePanel(
                            message:
                                '${_statusError!}${status == null ? '' : ' Showing last fetched status; it may be stale.'}',
                            onRetry: _busy ? null : _refresh,
                          ),
                        if (_etaError != null)
                          MessagePanel(
                            message:
                                '${_etaError!}${eta == null ? '' : ' Showing last fetched arrival information; it may be stale.'}',
                            onRetry: _busy ? null : _refresh,
                          ),
                        if (status != null) ...[
                          const SectionTitle('Journey status'),
                          PassengerCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  status.currentStation?.label ??
                                      'Current station unavailable',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(delayLabel(status.delay)),
                                if (!status.hasObservation)
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'No running observation is available for this journey.',
                                      style: TextStyle(
                                        color: AppColors.mutedSteel,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                        if (destination != null) ...[
                          const SectionTitle('Arrival information'),
                          EtaDisplay(
                            destination:
                                destination.stop.station?.label ??
                                'Destination unavailable',
                            scheduledTime: destination.stop.scheduledArrival,
                            predictedTime:
                                destination.prediction?.predictedArrival,
                            actualTime: destination.stop.actualArrival,
                            delayMinutes: status?.delay,
                            method:
                                eta?.methodLabel ?? 'Prediction unavailable',
                          ),
                        ],
                        if (status != null) ...[
                          const SectionTitle('Stations on your route'),
                          if (!progressKnown && stops.isNotEmpty)
                            const MessagePanel(
                              message:
                                  'Current progress is unavailable. Stations are shown in scheduled route order.',
                            ),
                          if (stops.isEmpty)
                            const MessagePanel(
                              message:
                                  'No route has been supplied for this train.',
                            )
                          else
                            PassengerCard(child: StationTimeline(stops: stops)),
                        ],
                        if (status == null && eta != null) ...[
                          const SectionTitle('Station arrival information'),
                          const MessagePanel(
                            message:
                                'Route order and current progress are unavailable because status could not be loaded.',
                          ),
                          DataTag(eta.methodLabel),
                          for (final prediction in eta.remainingStations)
                            Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: PassengerCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      prediction.station?.label ??
                                          'Station unavailable',
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Scheduled: ${displayTime(prediction.scheduledArrival)}',
                                    ),
                                    if (eta.hasPredictions)
                                      Text(
                                        'Predicted: ${displayTime(prediction.predictedArrival)}',
                                      ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                        if (eta != null && eta.delayFactors.isNotEmpty) ...[
                          const SectionTitle('Reported delay factors'),
                          for (final factor in eta.delayFactors)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: PassengerCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      factor.factor.replaceAll('_', ' '),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      factor.description,
                                      style: const TextStyle(
                                        color: AppColors.mutedSteel,
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '${factor.contributionMinutes > 0 ? '+' : ''}${factor.contributionMinutes} min',
                                      style: TextStyle(
                                        color: factor.contributionMinutes < 0
                                            ? AppColors.liveGreen
                                            : AppColors.warningAmber,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                        const SizedBox(height: 20),
                        const Text(
                          'Timings reflect the latest available records. Refresh to check for updates.',
                          style: TextStyle(
                            color: AppColors.mutedSteel,
                            fontSize: 12,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
