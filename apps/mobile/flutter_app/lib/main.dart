import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'features/home/home_screen.dart';
import 'features/train_details/train_details_screen.dart';

void main() {
  runApp(const ProviderScope(child: SihEtaMobileApp()));
}

final _router = createAppRouter();

GoRouter createAppRouter({String initialLocation = '/'}) => GoRouter(
  initialLocation: initialLocation,
  routes: [
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

class SihEtaMobileApp extends StatelessWidget {
  final GoRouter? router;
  const SihEtaMobileApp({super.key, this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SIH ETA Train Intelligence',
      theme: AppTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      routerConfig: router ?? _router,
    );
  }
}
