import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/preferences.dart';
import 'core/services/onboarding_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'features/explore/explore_screen.dart';
import 'features/explore/directory_screen.dart';
import 'features/home/home_screen.dart';
import 'features/home/train_search_results_screen.dart';
import 'features/train_details/train_details_screen.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/saved/saved_journeys_screen.dart';
import 'features/network/network_screen.dart';
import 'features/network/journey_workspace_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [preferencesProvider.overrideWithValue(prefs)],
      child: const SihEtaMobileApp(),
    ),
  );
}

final _router = createAppRouter();

GoRouter createAppRouter({String initialLocation = '/'}) => GoRouter(
  initialLocation: initialLocation,
  routes: [
    GoRoute(
      path: '/journey-workspace',
      builder: (context, state) => const JourneyWorkspaceScreen(),
    ),
    GoRoute(
      path: '/guide',
      builder: (context, state) => OnboardingScreen(
        replay: true,
        onFinished: () => context.canPop() ? context.pop() : context.go('/'),
      ),
    ),
    GoRoute(
      path: '/saved',
      builder: (context, state) => const SavedJourneysScreen(),
    ),
    GoRoute(
      path: '/directory',
      builder: (context, state) => const DirectoryScreen(),
    ),
    GoRoute(
      path: '/board',
      builder: (context, state) => const DirectoryScreen(board: true),
    ),
    GoRoute(
      path: '/explore',
      builder: (context, state) => const ExploreScreen(),
    ),
    GoRoute(
      path: '/network',
      builder: (context, state) => const NetworkScreen(),
    ),
    GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
    GoRoute(
      path: '/search',
      builder: (context, state) {
        final query = state.uri.queryParameters;
        return TrainSearchResultsScreen(
          from: query['from'] ?? '',
          to: query['to'] ?? '',
          fromName: query['fromName'] ?? '',
          toName: query['toName'] ?? '',
          date: DateTime.tryParse(query['date'] ?? ''),
        );
      },
    ),
    GoRoute(
      path: '/trains/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return TrainDetailsScreen(
          trainNumber: id,
          stationCode: state.uri.queryParameters['station'],
          journeyDate: state.uri.queryParameters['date'],
        );
      },
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    appBar: AppBar(title: const Text('Page unavailable')),
    body: Center(
      child: FilledButton(
        onPressed: () => context.go('/'),
        child: const Text('Go to train search'),
      ),
    ),
  ),
);

class SihEtaMobileApp extends ConsumerWidget {
  final GoRouter? router;
  final bool enableOnboarding;
  const SihEtaMobileApp({super.key, this.router, this.enableOnboarding = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Etaernal',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ref.watch(appearanceProvider),
      debugShowCheckedModeBanner: false,
      routerConfig: router ?? _router,
      builder: (context, child) =>
          enableOnboarding && !ref.watch(onboardingProvider)
          ? OnboardingScreen(onFinished: () {})
          : child ?? const SizedBox.shrink(),
    );
  }
}
