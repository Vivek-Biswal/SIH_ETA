import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import '../../core/services/preferences.dart';
import '../../core/services/saved_journeys.dart';
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
  final String? stationCode;
  final String? journeyDate;
  const TrainDetailsScreen({
    super.key,
    required this.trainNumber,
    this.stationCode,
    this.journeyDate,
  });
  @override
  ConsumerState<TrainDetailsScreen> createState() => _TrainDetailsScreenState();
}

class _TrainDetailsScreenState extends ConsumerState<TrainDetailsScreen>
    with WidgetsBindingObserver {
  TrainStatus? _status;
  ETAModel? _eta;
  String? _statusError;
  String? _etaError;
  DateTime? _statusFetchedAt;
  DateTime? _etaFetchedAt;
  bool _loading = true;
  bool _busy = false;
  bool _savingJourney = false;
  int _request = 0;
  String? _journeyDate;
  int? _arrivalIndex;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _journeyDate = widget.journeyDate;
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_canAutoRefresh) _refresh();
    });
  }

  @override
  void didUpdateWidget(TrainDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.trainNumber != widget.trainNumber ||
        oldWidget.journeyDate != widget.journeyDate) {
      _resetJourney(widget.journeyDate);
      _refresh();
    } else if (oldWidget.stationCode != widget.stationCode) {
      _arrivalIndex = _uniqueStationIndex(_status, widget.stationCode);
    }
  }

  void _resetJourney(String? date) {
    _request++;
    _journeyDate = date;
    _status = null;
    _eta = null;
    _statusFetchedAt = null;
    _etaFetchedAt = null;
    _statusError = null;
    _etaError = null;
    _arrivalIndex = null;
    _busy = false;
    _loading = true;
  }

  int? _uniqueStationIndex(TrainStatus? status, String? code) {
    if (status == null || code == null) return null;
    final matches = <int>[
      for (var i = 0; i < status.route.length; i++)
        if (status.route[i].station?.code == code) i,
    ];
    return matches.length == 1 ? matches.single : null;
  }

  bool get _canAutoRefresh =>
      mounted &&
      (WidgetsBinding.instance.lifecycleState == null ||
          WidgetsBinding.instance.lifecycleState ==
              AppLifecycleState.resumed) &&
      ModalRoute.of(context)?.isCurrent == true;

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _request++;
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _canAutoRefresh) _refresh();
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
        final selectedCode =
            _arrivalIndex != null &&
                _status != null &&
                _arrivalIndex! < _status!.route.length
            ? _status!.route[_arrivalIndex!].station?.code
            : widget.stationCode;
        // Never retain data from a different journey during partial refresh.
        if (freshStatus != null && _eta?.date != freshStatus.date) {
          _eta = null;
          _etaFetchedAt = null;
        }
        if (freshEta != null && _status?.date != freshEta.date) {
          _status = null;
          _statusFetchedAt = null;
        }
        if (result.status.status == ApiResultStatus.notFound) {
          _status = null;
          _statusFetchedAt = null;
        }
        if (result.eta.status == ApiResultStatus.notFound) {
          _eta = null;
          _etaFetchedAt = null;
        }
        if (freshStatus != null) {
          ref.read(historyProvider.notifier).add(widget.trainNumber);
        }
        _status = freshStatus ?? _status;
        if (freshStatus != null) {
          _arrivalIndex = _uniqueStationIndex(freshStatus, selectedCode);
          _statusFetchedAt = result.fetchedAt;
        }
        _eta = freshEta ?? _eta;
        if (freshEta != null) _etaFetchedAt = result.fetchedAt;
        // Once resolved, keep this journey stable across midnight and refreshes.
        _journeyDate ??= freshStatus?.date ?? freshEta?.date;
        _statusError = result.status.isSuccess
            ? null
            : result.status.errorMessage ?? 'Status is unavailable.';
        _etaError = result.eta.isSuccess
            ? null
            : result.eta.errorMessage ?? 'Arrival predictions are unavailable.';
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
    final selectedStation = destination?.stop.station;
    final uniqueStation =
        selectedStation != null &&
        stops
                .where((s) => s.stop.station?.code == selectedStation.code)
                .length ==
            1;
    final savedJourney = status == null
        ? null
        : SavedJourney(
            trainNumber: status.trainNumber,
            trainName: status.trainName,
            journeyDate: status.date,
            stationCode: uniqueStation ? selectedStation.code : null,
            stationName: uniqueStation ? selectedStation.name : null,
          );
    final isSaved =
        savedJourney != null &&
        ref.watch(savedJourneysProvider).any((s) => s.id == savedJourney.id);
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
                    final now = DateTime.now();
                    final today = DateTime(now.year, now.month, now.day);
                    final firstDate = today.subtract(const Duration(days: 365));
                    final lastDate = today.add(const Duration(days: 120));
                    final selectedDate =
                        DateTime.tryParse(_journeyDate ?? '') ?? today;
                    final chosen = await showDatePicker(
                      context: context,
                      initialDate: selectedDate.isBefore(firstDate)
                          ? firstDate
                          : selectedDate.isAfter(lastDate)
                          ? lastDate
                          : selectedDate,
                      firstDate: firstDate,
                      lastDate: lastDate,
                      helpText: 'Date the train starts its journey',
                    );
                    if (chosen == null || !mounted) return;
                    setState(() => _resetJourney(formatSearchDate(chosen)));
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
                            'Status fetched: ${_statusFetchedAt == null ? 'Unavailable' : displayTime(_statusFetchedAt!.toUtc().toIso8601String())}',
                            style: TextStyle(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                          if (eta != null)
                            Text(
                              'Arrival information fetched: ${_etaFetchedAt == null ? 'Unavailable' : displayTime(_etaFetchedAt!.toUtc().toIso8601String())}',
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
                        const Padding(
                          padding: EdgeInsets.only(top: 12),
                          child: Text(
                            'Checks for updates every 30 seconds while this screen is open. Pull down to refresh now.',
                            style: TextStyle(fontSize: 12, height: 1.5),
                          ),
                        ),
                        if (_journeyDate != null &&
                            status == null &&
                            eta == null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: DataTag('Journey start date: $_journeyDate'),
                          ),
                        if (_journeyDate != null &&
                            (status != null || eta != null) &&
                            status?.date == null &&
                            eta?.date == null)
                          MessagePanel(
                            message:
                                'No dated journey record was returned for $_journeyDate. Check the journey start date using the calendar above.',
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
                          if (widget.stationCode != null &&
                              stops
                                      .where(
                                        (s) =>
                                            s.stop.station?.code ==
                                            widget.stationCode,
                                      )
                                      .length !=
                                  1)
                            MessagePanel(
                              message:
                                  '${widget.stationCode} could not be uniquely matched in this route. Choose an arrival station below.',
                            ),
                          SectionTitle('Arrival information'),
                          DropdownButtonFormField<int>(
                            key: const Key('arrival-station'),
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
                          if (savedJourney != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: OutlinedButton.icon(
                                key: const Key('save-journey'),
                                icon: Icon(
                                  isSaved
                                      ? Icons.bookmark
                                      : Icons.bookmark_border,
                                ),
                                label: Text(
                                  _savingJourney
                                      ? 'Saving…'
                                      : isSaved
                                      ? 'Journey saved'
                                      : !uniqueStation
                                      ? 'Save train and date'
                                      : status?.date == null
                                      ? 'Save train'
                                      : 'Save journey',
                                ),
                                onPressed: _savingJourney
                                    ? null
                                    : () async {
                                        setState(() => _savingJourney = true);
                                        final saved = ref.read(
                                          savedJourneysProvider.notifier,
                                        );
                                        try {
                                          if (isSaved) {
                                            await saved.remove(savedJourney.id);
                                          } else {
                                            await saved.save(savedJourney);
                                          }
                                          if (!context.mounted) return;
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                isSaved
                                                    ? 'Journey removed from saved journeys.'
                                                    : 'Journey saved. Open it from the Saved tab.',
                                              ),
                                            ),
                                          );
                                        } catch (_) {
                                          if (!context.mounted) return;
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Could not update saved journeys. Please retry.',
                                              ),
                                            ),
                                          );
                                        } finally {
                                          if (mounted) {
                                            setState(
                                              () => _savingJourney = false,
                                            );
                                          }
                                        }
                                      },
                              ),
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
