import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/saved_journeys.dart';
import '../../shared/widgets/passenger_components.dart';
import '../explore/explore_screen.dart';

class SavedJourneysScreen extends ConsumerWidget {
  const SavedJourneysScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final journeys = ref.watch(savedJourneysProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved journeys')),
      bottomNavigationBar: const AppNavigation(selected: 1),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Your next journey, a tap away',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          const Text(
            'Saved on this device. Open a journey to check the latest available arrival times.',
          ),
          const SizedBox(height: 24),
          if (journeys.isEmpty)
            PassengerCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.bookmark_border_rounded,
                    size: 44,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Keep your train handy',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Find a train, choose your arrival station, then tap Save journey. Its train start date and station will be remembered.',
                    textAlign: TextAlign.center,
                    style: TextStyle(height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => context.go('/'),
                    icon: const Icon(Icons.search),
                    label: const Text('Find your train'),
                  ),
                ],
              ),
            ),
          for (final journey in journeys)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: PassengerCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      journey.trainNumber,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      journey.trainName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      journey.stationCode == null
                          ? 'Arrival at destination'
                          : 'Arrival at ${journey.stationName ?? journey.stationCode}',
                    ),
                    Text(
                      journey.journeyDate == null
                          ? 'Latest available journey'
                          : 'Train starts ${journey.journeyDate}',
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        FilledButton.tonalIcon(
                          key: Key('open-saved-${journey.id}'),
                          onPressed: () => context.push(journey.location),
                          icon: const Icon(Icons.arrow_forward),
                          label: const Text('Check arrival'),
                        ),
                        TextButton.icon(
                          key: Key('remove-saved-${journey.id}'),
                          onPressed: () async {
                            final messenger = ScaffoldMessenger.of(context);
                            try {
                              await ref
                                  .read(savedJourneysProvider.notifier)
                                  .remove(journey.id);
                              if (!context.mounted) return;
                              messenger.showSnackBar(
                                SnackBar(
                                  content: const Text('Journey removed'),
                                  action: SnackBarAction(
                                    label: 'Undo',
                                    onPressed: () async {
                                      try {
                                        await ref
                                            .read(
                                              savedJourneysProvider.notifier,
                                            )
                                            .save(journey);
                                      } catch (_) {
                                        if (context.mounted) {
                                          messenger.showSnackBar(
                                            const SnackBar(
                                              content: Text(
                                                'Could not restore this journey. Please retry.',
                                              ),
                                            ),
                                          );
                                        }
                                      }
                                    },
                                  ),
                                ),
                              );
                            } catch (_) {
                              if (context.mounted) {
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Could not remove this journey. Please retry.',
                                    ),
                                  ),
                                );
                              }
                            }
                          },
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Remove'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          if (journeys.isNotEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Up to 20 recent saves are kept. Saving a journey does not enable notifications or store live updates offline.',
                style: TextStyle(fontSize: 13, height: 1.5),
              ),
            ),
        ],
      ),
    );
  }
}
