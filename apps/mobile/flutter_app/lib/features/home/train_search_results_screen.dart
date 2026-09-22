import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/train_models.dart';
import '../../core/services/train_repository.dart';
import '../../shared/widgets/passenger_components.dart';

class TrainSearchResultsScreen extends ConsumerStatefulWidget {
  final String from, to, fromName, toName;
  final DateTime? date;
  const TrainSearchResultsScreen({
    super.key,
    required this.from,
    required this.to,
    this.fromName = '',
    this.toName = '',
    this.date,
  });
  @override
  ConsumerState<TrainSearchResultsScreen> createState() =>
      _TrainSearchResultsState();
}

class _TrainSearchResultsState extends ConsumerState<TrainSearchResultsScreen> {
  TrainSearchPage? _results;
  DateTime? _date;
  String? _error;
  String _sort = 'departure';
  bool _loading = false;
  int _request = 0, _page = 1;

  @override
  void initState() {
    super.initState();
    _date = widget.date;
    _load();
  }

  @override
  void didUpdateWidget(TrainSearchResultsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.from != widget.from ||
        oldWidget.to != widget.to ||
        oldWidget.date != widget.date) {
      _request++;
      _loading = false;
      _date = widget.date;
      _load();
    }
  }

  Future<void> _load({int page = 1}) async {
    if (_loading) return;
    if (widget.from.length < 2 ||
        widget.to.length < 2 ||
        widget.from == widget.to) {
      setState(
        () => _error = 'Choose different origin and destination stations.',
      );
      return;
    }
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
      _results = null;
      _page = page;
    });
    try {
      final result = await ref
          .read(trainRepositoryProvider)
          .searchTrains(widget.from, widget.to, date: _date, page: page);
      if (!mounted || request != _request) return;
      setState(() {
        _loading = false;
        _results = result.data;
        _error = result.isSuccess
            ? null
            : result.errorMessage ?? 'Unable to load trains.';
      });
    } catch (_) {
      if (!mounted || request != _request) return;
      setState(() {
        _loading = false;
        _error = 'Unable to load trains. Please retry.';
      });
    }
  }

  bool _runsOnDate(TrainSummary train) {
    if (_date == null || train.daysOfRun == null || train.daysOfRun!.isEmpty) {
      return true;
    }
    final day = [
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ][_date!.weekday - 1];
    return train.daysOfRun!.any(
      (d) => d.toLowerCase() == 'daily' || d.toLowerCase().startsWith(day),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    String sortValue(TrainSummary train) => _sort == 'name'
        ? train.trainName
        : _sort == 'arrival'
        ? train.arrivalTime ?? 'ZZ'
        : train.departureTime ?? 'ZZ';
    final trains =
        (_results?.trains.where(_runsOnDate).toList() ?? <TrainSummary>[])
          ..sort((a, b) => sortValue(a).compareTo(sortValue(b)));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Train search results'),
        leading: IconButton(
          tooltip: 'Back to search',
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(page: _page),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    PassengerCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              widget.fromName.isEmpty
                                  ? widget.from
                                  : '${widget.fromName}\n${widget.from}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Icon(
                              Icons.arrow_forward,
                              color: colors.primary,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              widget.toName.isEmpty
                                  ? widget.to
                                  : '${widget.toName}\n${widget.to}',
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        OutlinedButton.icon(
                          icon: const Icon(
                            Icons.calendar_today_outlined,
                            size: 18,
                          ),
                          label: Text(
                            _date == null
                                ? 'All running days'
                                : formatSearchDate(_date!),
                          ),
                          onPressed: _loading
                              ? null
                              : () async {
                                  final now = DateTime.now();
                                  final today = DateTime(
                                    now.year,
                                    now.month,
                                    now.day,
                                  );
                                  final selected = await showDatePicker(
                                    context: context,
                                    initialDate:
                                        _date != null && !_date!.isBefore(today)
                                        ? _date
                                        : today,
                                    firstDate: today,
                                    lastDate: today.add(
                                      const Duration(days: 120),
                                    ),
                                  );
                                  if (mounted && selected != null) {
                                    setState(() => _date = selected);
                                    await _load();
                                  }
                                },
                        ),
                        if (_date != null)
                          TextButton(
                            onPressed: _loading
                                ? null
                                : () {
                                    setState(() => _date = null);
                                    _load();
                                  },
                            child: const Text('Clear date'),
                          ),
                      ],
                    ),
                    if (_date != null)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: Text(
                          'Published running days are not confirmation of operation. Unknown running days remain visible.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    if (_loading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Column(
                          children: [
                            LinearProgressIndicator(),
                            SizedBox(height: 12),
                            Text('Finding trains…'),
                          ],
                        ),
                      ),
                    if (_error != null)
                      MessagePanel(
                        message: _error!,
                        onRetry: () => _load(page: _page),
                      ),
                    if (_results != null) ...[
                      Text(
                        '${_results!.total} services · page ${_results!.page}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${sourceLabel(_results!.source)} · Scheduled services',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      DropdownButton<String>(
                        value: _sort,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'departure',
                            child: Text('Sort this page: departure time'),
                          ),
                          DropdownMenuItem(
                            value: 'arrival',
                            child: Text('Sort this page: arrival time'),
                          ),
                          DropdownMenuItem(
                            value: 'name',
                            child: Text('Sort this page: train name'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _sort = value);
                        },
                      ),
                      if (trains.isEmpty)
                        const MessagePanel(
                          message:
                              'No trains match these endpoints. Try another origin or destination.',
                          icon: Icons.search_off,
                        ),
                      for (final train in trains)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
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
                                    style: TextStyle(
                                      color: colors.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    train.trainName,
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    '${train.origin?.label ?? widget.from} → ${train.destination?.label ?? widget.to}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
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
                                  const SizedBox(height: 8),
                                  Text(
                                    train.daysOfRun?.join(' · ') ??
                                        'Running days unavailable',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'View status & arrival information →',
                                    style: TextStyle(color: colors.primary),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        children: [
                          if (_results!.page > 1)
                            OutlinedButton(
                              onPressed: () => _load(page: _results!.page - 1),
                              child: const Text('Previous page'),
                            ),
                          if (_results!.hasNext)
                            OutlinedButton(
                              onPressed: () => _load(page: _results!.page + 1),
                              child: const Text('Next page'),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
