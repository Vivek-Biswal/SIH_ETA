import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/eta_feedback.dart';
import 'passenger_components.dart';

class EtaFeedbackCard extends ConsumerStatefulWidget {
  final String trainNumber, date, stationCode, stationName;
  final int? sequence;
  final String? predictedArrival, observedAt, modelVersion;
  const EtaFeedbackCard({
    super.key,
    required this.trainNumber,
    required this.date,
    required this.stationCode,
    required this.stationName,
    this.sequence,
    this.predictedArrival,
    this.observedAt,
    this.modelVersion,
  });
  String get journeyKey => '$trainNumber|$date|$stationCode|${sequence ?? ''}';
  @override
  ConsumerState<EtaFeedbackCard> createState() => _EtaFeedbackCardState();
}

class _EtaFeedbackCardState extends ConsumerState<EtaFeedbackCard> {
  final _comment = TextEditingController();
  String? _rating, _reason, _error;
  FeedbackReport? _report;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _report = ref.read(etaFeedbackRepositoryProvider).latest(widget.journeyKey);
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final repository = ref.read(etaFeedbackRepositoryProvider);
    try {
      final result = _report != null
          ? await repository.send(_report!)
          : await repository.submit(widget.journeyKey, {
              'train_number': widget.trainNumber,
              'journey_date': widget.date,
              'station_code': widget.stationCode,
              'route_sequence': widget.sequence,
              'rating': _rating,
              'reason': _rating == 'inaccurate' ? _reason : null,
              'comment': _comment.text.trim(),
              'predicted_arrival': widget.predictedArrival,
              'observation_timestamp': widget.observedAt,
              'model_version': widget.modelVersion,
            });
      if (mounted) setState(() => _report = result);
    } catch (_) {
      if (mounted) {
        setState(() {
          _report = repository.latest(widget.journeyKey);
          _error = _report == null
              ? 'Feedback could not be saved on this device. Please retry.'
              : 'Your device copy is safe. Please try sending it again.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: PassengerCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.rate_review_outlined, color: colors.primary),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Help improve arrival estimates',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Feedback for ${widget.stationName}',
              style: TextStyle(color: colors.onSurfaceVariant, height: 1.5),
            ),
            if (_report case final report?) ...[
              const SizedBox(height: 14),
              Text(
                report.sent
                    ? 'Feedback received. Thank you.'
                    : 'Saved on this device · not sent yet',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Text(
                report.sent
                    ? 'Your report is unverified passenger feedback. It does not change the ETA or automatically train the model.'
                    : 'Your report will stay here if the service is unavailable. Tap below to try sending it again.',
                style: const TextStyle(height: 1.5),
              ),
              if (report.payload['predicted_arrival'] != null)
                Text(
                  'Estimate reported: ${displayTime(report.payload['predicted_arrival'] as String?)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: colors.onSurfaceVariant,
                  ),
                ),
              if (!report.sent)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: const Icon(Icons.send_outlined),
                    label: Text(_busy ? 'Sending…' : 'Send saved feedback'),
                  ),
                ),
            ] else ...[
              const SizedBox(height: 12),
              const Text(
                'How did the estimate compare with your journey?',
                style: TextStyle(height: 1.5),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (widget.predictedArrival != null) ...[
                    ChoiceChip(
                      label: const Text('Accurate'),
                      selected: _rating == 'accurate',
                      onSelected: _busy
                          ? null
                          : (_) => setState(() => _rating = 'accurate'),
                    ),
                    ChoiceChip(
                      label: const Text('It was off'),
                      selected: _rating == 'inaccurate',
                      onSelected: _busy
                          ? null
                          : (_) => setState(() => _rating = 'inaccurate'),
                    ),
                  ],
                  ChoiceChip(
                    label: const Text('ETA unavailable'),
                    selected: _rating == 'unavailable',
                    onSelected: _busy
                        ? null
                        : (_) => setState(() => _rating = 'unavailable'),
                  ),
                ],
              ),
              if (_rating == 'inaccurate') ...[
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _reason,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'What did you notice? (optional)',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'train_delayed',
                      child: Text('Arrived later than expected'),
                    ),
                    DropdownMenuItem(
                      value: 'train_early',
                      child: Text('Arrived earlier than expected'),
                    ),
                    DropdownMenuItem(
                      value: 'unexpected_stop',
                      child: Text('An unexpected stop'),
                    ),
                    DropdownMenuItem(
                      value: 'weather',
                      child: Text('Weather affected the journey'),
                    ),
                    DropdownMenuItem(
                      value: 'other',
                      child: Text('Something else'),
                    ),
                  ],
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _reason = value),
                ),
              ],
              if (_rating != null) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _comment,
                  enabled: !_busy,
                  maxLength: 500,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Details (optional)',
                    hintText:
                        'Please don’t include phone numbers or personal details.',
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton.icon(
                  key: const Key('send-eta-feedback'),
                  onPressed: _busy ? null : _submit,
                  icon: const Icon(Icons.send_outlined),
                  label: Text(_busy ? 'Saving and sending…' : 'Send feedback'),
                ),
              ],
              const SizedBox(height: 10),
              Text(
                'A copy is kept on your device. Reports are passenger observations, not confirmed railway causes.',
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: colors.onSurfaceVariant,
                ),
              ),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(_error!, style: TextStyle(color: colors.error)),
              ),
          ],
        ),
      ),
    );
  }
}
