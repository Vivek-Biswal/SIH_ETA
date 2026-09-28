import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/preferences.dart';
import '../../shared/widgets/passenger_components.dart';

class AppNavigation extends StatelessWidget {
  final int selected;
  const AppNavigation({super.key, required this.selected});
  @override
  Widget build(BuildContext context) => NavigationBar(
    selectedIndex: selected,
    onDestinationSelected: (i) =>
        context.go(['/', '/saved', '/journey-workspace', '/explore'][i]),
    destinations: const [
      NavigationDestination(
        icon: Icon(Icons.train_outlined),
        selectedIcon: Icon(Icons.train),
        label: 'Search',
      ),
      NavigationDestination(
        icon: Icon(Icons.bookmark_border),
        selectedIcon: Icon(Icons.bookmark),
        label: 'Saved',
      ),
      NavigationDestination(icon: Icon(Icons.hub_outlined), label: 'Insights'),
      NavigationDestination(icon: Icon(Icons.help_outline), label: 'Help'),
    ],
  );
}

class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Help & settings')),
    bottomNavigationBar: const AppNavigation(selected: 3),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        PassengerCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'A little help for your journey',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                'Learn to find your train, read arrival estimates and save a journey.',
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                key: const Key('replay-guide'),
                onPressed: () => context.push('/guide'),
                icon: const Icon(Icons.explore_outlined),
                label: const Text('Show app guide'),
              ),
            ],
          ),
        ),
        const SectionTitle('Understanding your arrival time'),
        const PassengerCard(
          child: Column(
            children: [
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text('What does ETA mean?'),
                children: [
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'ETA means expected time of arrival. It is an estimate that can change as new information arrives. Scheduled arrival is the timetable time. Actual arrival means the train has been reported at that station.',
                      style: TextStyle(height: 1.5),
                    ),
                  ),
                ],
              ),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text('Which date should I choose?'),
                children: [
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Choose the date your train leaves its first station. For an overnight or multi-day train, this can be earlier than the date you board. You can change it with the calendar in train details.',
                      style: TextStyle(height: 1.5),
                    ),
                  ),
                ],
              ),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text('Why is an update old or unavailable?'),
                children: [
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Train details checks for updates every 30 seconds while open. A recent check can still return an older railway observation. Check the last observation time. If the connection fails, previously loaded details are labelled as old; saved journeys are shortcuts and need internet for new updates.',
                      style: TextStyle(height: 1.5),
                    ),
                  ),
                ],
              ),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text('Will I get a station alert?'),
                children: [
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Saving a journey does not send alerts. The reminder option opens your phone clock for you to confirm an alarm. That alarm uses the device time zone and will not adjust if the train is delayed.',
                      style: TextStyle(height: 1.5),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SectionTitle('Make it yours'),
        PassengerCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Appearance',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                children: [
                  for (final mode in ThemeMode.values)
                    ChoiceChip(
                      label: Text(switch (mode) {
                        ThemeMode.system => 'System',
                        ThemeMode.light => 'Light',
                        ThemeMode.dark => 'Dark',
                      }),
                      selected: ref.watch(appearanceProvider) == mode,
                      onSelected: (_) =>
                          ref.read(appearanceProvider.notifier).setMode(mode),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SectionTitle('Your recent trains'),
        if (ref.watch(historyProvider).isEmpty)
          const MessagePanel(
            message:
                'Trains you open will appear here. Your history stays on this device.',
          ),
        for (final number in ref.watch(historyProvider))
          ListTile(
            leading: const Icon(Icons.history),
            title: Text('Train $number'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/trains/$number'),
          ),
        if (ref.watch(historyProvider).isNotEmpty)
          TextButton.icon(
            onPressed: () => ref.read(historyProvider.notifier).clear(),
            icon: const Icon(Icons.delete_outline),
            label: const Text('Clear history'),
          ),
        const SectionTitle('Data & coverage'),
        const PassengerCard(
          child: Text(
            'Arrival predictions and observations are shown only when supplied by the connected service. A timetable is not a live prediction. Missing information is marked unavailable.',
            style: TextStyle(height: 1.6),
          ),
        ),
        const SizedBox(height: 12),
        const PassengerCard(
          child: Text(
            'Ticket booking, fares, seat availability and PNR are not available in this app.',
            style: TextStyle(height: 1.6),
          ),
        ),
      ],
    ),
  );
}
