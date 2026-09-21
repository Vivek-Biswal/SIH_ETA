import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'features/explore/explore_screen.dart';
import 'features/explore/directory_screen.dart';
import 'features/home/home_screen.dart';
import 'features/train_details/train_details_screen.dart';

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
      builder: (context, state) => const NetworkSpace(),
    ),
    GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
    GoRoute(
      path: '/trains/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return TrainDetailsScreen(trainNumber: id);
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
  const SihEtaMobileApp({super.key, this.router});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'SIH ETA Train Intelligence',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ref.watch(appearanceProvider),
      debugShowCheckedModeBanner: false,
      routerConfig: router ?? _router,
    );
  }
}
