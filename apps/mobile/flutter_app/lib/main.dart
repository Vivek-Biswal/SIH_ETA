import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/theme/app_theme.dart';
import 'features/home/home_screen.dart';
import 'features/train_details/train_details_screen.dart';

void main() {
  runApp(const ProviderScope(child: SihEtaMobileApp()));
}

final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/trains/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '12301';
        return TrainDetailsScreen(trainNumber: id);
      },
    ),
  ],
);

class SihEtaMobileApp extends StatelessWidget {
  const SihEtaMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SIH ETA Train Intelligence',
      theme: AppTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      routerConfig: _router,
    );
  }
}
