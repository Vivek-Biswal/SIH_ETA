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
    onDestinationSelected: (i) => context.go(['/', '/explore', '/network'][i]),
    destinations: const [
      NavigationDestination(
        icon: Icon(Icons.train_outlined),
        selectedIcon: Icon(Icons.train),
        label: 'Journeys',
      ),
      NavigationDestination(icon: Icon(Icons.tune), label: 'Travel tools'),
      NavigationDestination(icon: Icon(Icons.hub_outlined), label: 'Network'),
    ],
  );
}

class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Travel tools')),
    bottomNavigationBar: const AppNavigation(selected: 1),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
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
            'Fares, seat availability, PNR and coach positions require a connected railway data provider. These data feeds are not currently available in this project.',
            style: TextStyle(height: 1.6),
          ),
        ),
      ],
    ),
  );
}

class NetworkSpace extends StatelessWidget {
  const NetworkSpace({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Network intelligence')),
    bottomNavigationBar: const AppNavigation(selected: 2),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(24),
          children: [
            Icon(
              Icons.hub_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            const Text(
              'A wider view of your journey',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            const Text(
              'Network intelligence is planned for a future release. No network feed is connected yet.',
              textAlign: TextAlign.center,
              style: TextStyle(height: 1.6),
            ),
            const SizedBox(height: 28),
            const PassengerCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Planned coverage',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Congestion across stations and routes\nDelay propagation and affected services\nDisruptions and network alerts',
                    style: TextStyle(height: 2),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/'),
              child: const Text('Find your train'),
            ),
          ],
        ),
      ),
    ),
  );
}
