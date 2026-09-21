import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import '../../core/services/preferences.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/train_models.dart';
import '../../core/models/journey_view.dart';
import '../../core/network/api_client.dart';
import '../../core/services/train_repository.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/eta_display.dart';
import '../../shared/widgets/station_reminder.dart';
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
  String? _journeyDate;
  int? _arrivalIndex;

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
          .getJourney(widget.trainNumber, date: _journeyDate);
      if (!mounted || request != _request) return;
      setState(() {
        final freshStatus = result.status.data;
        final freshEta = result.eta.data;
        // Never retain data from a different journey during partial refresh.
        if (freshStatus != null && _eta?.date != freshStatus.date) _eta = null;
        if (freshEta != null && _status?.date != freshEta.date) _status = null;
        if (result.status.status == ApiResultStatus.notFound) _status = null;
        if (result.eta.status == ApiResultStatus.notFound) _eta = null;
        if (freshStatus != null) {
          ref.read(historyProvider.notifier).add(widget.trainNumber);
        }
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
        DateTime.now().difference(observed) > Duration(minutes: 5);
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final eta = _eta;
    final stops = status == null ? <JourneyStop>[] : journeyStops(status, eta);
    final destination = stops.isEmpty
        ? null
        : stops[_arrivalIndex != null && _arrivalIndex! < stops.length
              ? _arrivalIndex!
              : stops.length - 1];
    final progressKnown = stops.any((s) => s.stage != StopStage.unknown);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back to search',
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          icon: Icon(Icons.arrow_back),
        ),
        title: Text(
          'Train ${widget.trainNumber}',
          style: TextStyle(fontFamily: 'monospace', fontSize: 18),
        ),
        actions: [
          IconButton(
            tooltip: 'Journey start date',
            icon: const Icon(Icons.calendar_month_outlined),
            onPressed: _busy
                ? null
                : () async {
                    final today = DateTime.now();
                    final chosen = await showDatePicker(
                      context: context,
                      initialDate:
                          DateTime.tryParse(_journeyDate ?? '') ?? today,
                      firstDate: today.subtract(const Duration(days: 365)),
                      lastDate: today.add(const Duration(days: 120)),
                      helpText: 'Date the train starts its journey',
                    );
                    if (chosen == null || !mounted) return;
                    setState(() {
                      _journeyDate = chosen.toIso8601String().split('T').first;
                      _status = null;
                      _eta = null;
                      _loading = true;
                    });
                    _refresh();
                  },
          ),
          IconButton(
            tooltip: 'Share journey',
            icon: const Icon(Icons.share_outlined),
            onPressed: status == null
                ? null
                : () async {
                    final summary =
                        '${status.trainNumber} · ${status.trainName}\nJourney: ${status.date ?? "Unavailable"}\n${delayLabel(status.delay)}\nLast observation: ${displayTime(status.observedAt)}\nSource: ${sourceLabel(status.source)}';
                    try {
                      if (!kIsWeb &&
                          defaultTargetPlatform == TargetPlatform.android) {
                        await const MethodChannel(
                          'sih_eta/travel',
                        ).invokeMethod('share', {'text': summary});
                      } else {
                        await Clipboard.setData(ClipboardData(text: summary));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Journey summary copied. Paste it to share.',
                              ),
                            ),
                          );
                        }
                      }
                    } catch (_) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Sharing is unavailable on this device.',
                            ),
                          ),
                        );
                      }
                    }
                  },
          ),
          IconButton(
            key: Key('refresh-journey'),
            tooltip: 'Refresh train',
            onPressed: _busy ? null : _refresh,
            icon: Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: SingleChildScrollView(
                physics: AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(20, 12, 20, 32),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: 640),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_busy)
                          Padding(
                            padding: EdgeInsets.only(bottom: 16),
                            child: LinearProgressIndicator(),
                          ),
                        if (status != null || eta != null) ...[
                          Text(
                            status?.trainName ?? eta!.trainName,
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(height: 12),
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
                                DataTag('Observation over 5 minutes old'),
                            ],
                          ),
                          if (eta != null &&
                              status != null &&
                              eta.source != status.source)
                            Padding(
                              padding: EdgeInsets.only(top: 8),
                              child: DataTag('ETA: ${sourceLabel(eta.source)}'),
                            ),
                          SizedBox(height: 12),
                          Text(
                            'Last fetched: ${_fetchedAt == null ? 'Unavailable' : displayTime(_fetchedAt!.toUtc().toIso8601String())}',
                            style: TextStyle(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Last observation: ${displayTime(status?.observedAt)}',
                            style: TextStyle(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                          if (eta?.generatedAt != null)
                            Text(
                              'Prediction generated: ${displayTime(eta!.generatedAt)}',
                              style: TextStyle(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
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
                          SectionTitle('Journey status'),
                          PassengerCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  status.currentStation?.label ??
                                      'Current station unavailable',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(delayLabel(status.delay)),
                                if (!status.hasObservation)
                                  Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'No running observation is available for this journey.',
                                      style: TextStyle(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.onSurfaceVariant,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                        if (destination != null) ...[
                          SectionTitle('Arrival information'),
                          DropdownButtonFormField<int>(
                            value:
                                _arrivalIndex != null &&
                                    _arrivalIndex! < stops.length
                                ? _arrivalIndex!
                                : stops.length - 1,
                            decoration: const InputDecoration(
                              labelText: 'Arrival station',
                            ),
                            isExpanded: true,
                            items: [
                              for (var i = 0; i < stops.length; i++)
                                DropdownMenuItem(
                                  value: i,
                                  child: Text(
                                    stops[i].stop.station?.label ??
                                        'Station unavailable',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                            ],
                            onChanged: (value) =>
                                setState(() => _arrivalIndex = value),
                          ),
                          const SizedBox(height: 12),
                          EtaDisplay(
                            destination:
                                destination.stop.station?.label ??
                                'Destination unavailable',
                            scheduledTime: destination.stop.scheduledArrival,
                            predictedTime:
                                destination.prediction?.predictedArrival,
                            actualTime: destination.stop.actualArrival,
                            delayMinutes: status?.delay,
                            predictedDelayMinutes:
                                destination.prediction?.predictedDelayMinutes,
                            evidence: eta,
                            method:
                                eta?.methodLabel ?? 'Prediction unavailable',
                          ),
                        ],
                        if (status != null) ...[
                          StationReminderButton(
                            trainNumber: widget.trainNumber,
                            stops: stops,
                          ),
                          SectionTitle('Stations on your route'),
                          if (!progressKnown && stops.isNotEmpty)
                            MessagePanel(
                              message:
                                  'Current progress is unavailable. Stations are shown in scheduled route order.',
                            ),
                          if (stops.isEmpty)
                            MessagePanel(
                              message:
                                  'No route has been supplied for this train.',
                            )
                          else
                            PassengerCard(child: StationTimeline(stops: stops)),
                        ],
                        if (status == null && eta != null) ...[
                          SectionTitle('Station arrival information'),
                          MessagePanel(
                            message:
                                'Route order and current progress are unavailable because status could not be loaded.',
                          ),
                          DataTag(eta.methodLabel),
                          for (final prediction in eta.remainingStations)
                            Padding(
                              padding: EdgeInsets.only(top: 10),
                              child: PassengerCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      prediction.station?.label ??
                                          'Station unavailable',
                                    ),
                                    SizedBox(height: 8),
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
                          SectionTitle('Reported delay factors'),
                          for (final factor in eta.delayFactors)
                            Padding(
                              padding: EdgeInsets.only(bottom: 10),
                              child: PassengerCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      factor.factor.replaceAll('_', ' '),
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      factor.description,
                                      style: TextStyle(
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.onSurfaceVariant,
                                        height: 1.4,
                                      ),
                                    ),
                                    SizedBox(height: 8),
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
                        SizedBox(height: 20),
                        Text(
                          'Timings reflect the latest available records. Refresh to check for updates.',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurfaceVariant,
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
