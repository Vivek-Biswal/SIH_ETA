import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/onboarding_preferences.dart';
import '../../shared/widgets/passenger_components.dart';

/// A self-contained guide. The caller decides where to go after it closes.
class OnboardingScreen extends ConsumerStatefulWidget {
  final VoidCallback onFinished;
  final bool replay;

  const OnboardingScreen({
    super.key,
    required this.onFinished,
    this.replay = false,
  });

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _scrollController = ScrollController();
  int _page = 0;
  bool _finishing = false;
  String? _error;

  static const _steps = [
    _GuideStep(
      icon: Icons.search_rounded,
      title: 'Find your train',
      description:
          'Search by train number or name. Or choose your starting and arrival stations to find a train on your route.',
      tips: [
        _GuideTip(
          Icons.train_outlined,
          'Know your train?',
          'Enter its number or name and open the matching train.',
        ),
        _GuideTip(
          Icons.route_outlined,
          'Planning a journey?',
          'Choose From and To stations, then the date your train leaves its first station.',
        ),
      ],
    ),
    _GuideStep(
      icon: Icons.schedule_rounded,
      title: 'Understand your arrival time',
      description:
          'Expected arrival is the latest estimate. Scheduled arrival is the timetable. An estimate can change as the journey continues.',
      tips: [
        _GuideTip(
          Icons.update_rounded,
          'Check how recent it is',
          'Look at the last observation before you plan. Train details check for updates every 30 seconds while active.',
        ),
        _GuideTip(
          Icons.info_outline_rounded,
          'Live data depends on coverage',
          'Live information appears only when a connected provider supplies it. Missing or old information is clearly labelled.',
        ),
      ],
    ),
    _GuideStep(
      icon: Icons.bookmark_border_rounded,
      title: 'Keep your journey handy',
      description:
          'Choose the station you want to reach, then save your journey so it is easy to find again.',
      tips: [
        _GuideTip(
          Icons.location_on_outlined,
          'Choose your arrival station',
          'In train details, select a station on the route to see its arrival information.',
        ),
        _GuideTip(
          Icons.bookmark_add_outlined,
          'Save it for later',
          'Saved journeys stay on this device. Open the Saved tab to check again.',
        ),
      ],
    ),
    _GuideStep(
      icon: Icons.train_rounded,
      title: 'Ready for your journey',
      description:
          'Start with your train or route. We will show the available arrival information and help you understand it.',
      tips: [
        _GuideTip(
          Icons.lock_outline_rounded,
          'Simple to get started',
          'No account or location permission is needed. An internet connection is needed to check train information.',
        ),
        _GuideTip(
          Icons.help_outline_rounded,
          'Help is always here',
          'Replay this guide from the Help tab whenever you need it.',
        ),
      ],
    ),
  ];

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _showPage(int page) {
    setState(() => _page = page);
    if (_scrollController.hasClients) _scrollController.jumpTo(0);
  }

  Future<void> _finish() async {
    if (_finishing) return;
    setState(() {
      _finishing = true;
      _error = null;
    });
    try {
      if (!widget.replay) {
        await ref.read(onboardingProvider.notifier).complete();
      }
      if (mounted) widget.onFinished();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _finishing = false;
        _error = 'Could not save your guide preference. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final step = _steps[_page];
    final lastPage = _page == _steps.length - 1;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 12, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.replay
                              ? 'Your travel guide'
                              : 'Welcome to Eternal',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _finishing ? null : _finish,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 48),
                        ),
                        child: Text(widget.replay ? 'Close' : 'Skip'),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                  child: Semantics(
                    label: 'Step ${_page + 1} of ${_steps.length}',
                    liveRegion: true,
                    child: ExcludeSemantics(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Step ${_page + 1} of ${_steps.length}',
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              for (
                                var index = 0;
                                index < _steps.length;
                                index++
                              )
                                Expanded(
                                  child: Container(
                                    margin: EdgeInsets.only(
                                      right: index < _steps.length - 1 ? 6 : 0,
                                    ),
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: index <= _page
                                          ? colors.primary
                                          : colors.outlineVariant,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ExcludeSemantics(
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            decoration: BoxDecoration(
                              color: colors.primaryContainer,
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: _page == 0 ? Image.asset('assets/brand/logo.png', height: 110) : Icon(
                              step.icon,
                              size: 72,
                              color: colors.onPrimaryContainer,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Semantics(
                          header: true,
                          child: Text(
                            step.title,
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          step.description,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 24),
                        for (final tip in step.tips) ...[
                          PassengerCard(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ExcludeSemantics(
                                  child: Icon(tip.icon, color: colors.primary),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        tip.title,
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        tip.description,
                                        style: theme.textTheme.bodyMedium
                                            ?.copyWith(
                                              height: 1.5,
                                              color: colors.onSurfaceVariant,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (_error != null)
                          Semantics(liveRegion: true, child: Text(_error!)),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
                  child: Row(
                    children: [
                      if (_page > 0) ...[
                        OutlinedButton(
                          onPressed: _finishing
                              ? null
                              : () => _showPage(_page - 1),
                          child: const Text('Back'),
                        ),
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                        child: FilledButton(
                          onPressed: _finishing
                              ? null
                              : lastPage
                              ? _finish
                              : () => _showPage(_page + 1),
                          child: Text(lastPage ? 'Done' : 'Next'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GuideStep {
  final IconData icon;
  final String title;
  final String description;
  final List<_GuideTip> tips;

  const _GuideStep({
    required this.icon,
    required this.title,
    required this.description,
    required this.tips,
  });
}

class _GuideTip {
  final IconData icon;
  final String title;
  final String description;

  const _GuideTip(this.icon, this.title, this.description);
}
