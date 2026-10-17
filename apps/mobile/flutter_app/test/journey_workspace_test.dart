import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:sih_eta/core/navigation/app_navigation.dart';
import 'package:sih_eta/core/theme/app_theme.dart';
import 'package:sih_eta/features/network/journey_workspace_screen.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';

void main() {
  late _WorkspacePlatform platform;
  late GoRouter router;

  setUp(() {
    platform = _WorkspacePlatform();
    WebViewPlatform.instance = platform;
    router = GoRouter(
      observers: [appRouteObserver],
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const Scaffold(body: Text('Previous screen')),
          routes: [
            GoRoute(
              path: 'journey-workspace',
              builder: (_, _) => const JourneyWorkspaceScreen(),
            ),
            GoRoute(
              path: 'network',
              builder: (_, _) =>
                  const Scaffold(body: Text('Native past delays')),
            ),
            GoRoute(
              path: 'trains/:id',
              builder: (_, state) =>
                  Scaffold(body: Text('Train ${state.pathParameters['id']}')),
            ),
          ],
        ),
      ],
    );
  });

  tearDown(() {
    router.dispose();
  });

  Future<void> openWorkspace(WidgetTester tester, {bool dark = false}) async {
    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
        theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
      ),
    );
    unawaited(router.push('/journey-workspace'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
  }

  testWidgets(
    'loads one themed workspace and shows a useful loading state',
    (tester) async {
      await openWorkspace(tester, dark: true);
      final url = platform.controller.history.single;
      expect(url.path, '/journey-insights');
      expect(url.queryParameters['embed'], 'mobile');
      expect(url.queryParameters['theme'], 'dark');
      expect(find.text('Opening journey insights'), findsOneWidget);
      expect(find.text('Journey insights'), findsOneWidget);
      platform.controller.finish();
      await tester.pumpAndSettle();
      expect(find.text('Opening journey insights'), findsNothing);
      expect(find.byKey(const Key('embedded-journey-tools')), findsOneWidget);
      expect(platform.controller.loads, 1);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets(
    'AppBar and Android Back traverse web history before native history',
    (tester) async {
      await openWorkspace(tester);
      platform.controller.finish();
      platform.controller.visitMode('simulation');
      platform.controller.visitMode('history');
      await tester.pumpAndSettle();

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(platform.controller.backs, 1);
      expect(
        platform.controller.history.last.queryParameters['mode'],
        'simulation',
      );
      expect(router.state.uri.path, '/journey-workspace');

      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(platform.controller.backs, 2);
      expect(router.state.uri.path, '/journey-workspace');

      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Previous screen'), findsOneWidget);
      expect(router.state.uri.path, '/');
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets(
    'repeated Back during a pending platform response does not pop twice',
    (tester) async {
      await openWorkspace(tester);
      platform.controller.finish();
      platform.controller.visitMode('simulation');
      platform.controller.backBarrier = Completer<void>();
      await tester.pumpAndSettle();
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pump();
      expect(platform.controller.backs, 1);
      platform.controller.backBarrier!.complete();
      await tester.pumpAndSettle();
      expect(router.state.uri.path, '/journey-workspace');
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets(
    'train deep links keep their date and return to the existing workspace',
    (tester) async {
      await openWorkspace(tester);
      platform.controller.finish();
      platform.controller.visitMode('history');
      await tester.pumpAndSettle();
      final decision = await platform.delegate.navigation!(
        const NavigationRequest(
          url: 'https://equinox01.vercel.app/trains/12423?date=2026-10-17',
          isMainFrame: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(decision, NavigationDecision.prevent);
      expect(find.text('Train 12423'), findsOneWidget);
      expect(router.state.uri.queryParameters['date'], '2026-10-17');
      expect(
        platform.controller.scripts.any(
          (script) => script.contains('journey-pause'),
        ),
        isTrue,
      );
      router.pop();
      await tester.pumpAndSettle();
      expect(router.state.uri.path, '/journey-workspace');
      expect(
        platform.controller.history.last.queryParameters['mode'],
        'history',
      );
      expect(platform.controller.loads, 1);
      expect(
        platform.controller.scripts.any(
          (script) => script.contains('journey-resume'),
        ),
        isTrue,
      );
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets(
    'refresh preserves the selected mode and does not create another load',
    (tester) async {
      await openWorkspace(tester);
      platform.controller.finish();
      platform.controller.visitMode('analytics');
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Journey options'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Refresh this view'));
      await tester.pump();
      expect(platform.controller.reloads, 1);
      expect(
        platform.controller.history.last.queryParameters['mode'],
        'analytics',
      );
      expect(platform.controller.loads, 1);
      platform.controller.finish();
      await tester.pumpAndSettle();
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );

  testWidgets(
    'resource failures preserve content; main-page failures offer native recovery',
    (tester) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await openWorkspace(tester);
      platform.controller.finish();
      await tester.pumpAndSettle();
      platform.delegate.error!(
        const WebResourceError(
          errorCode: -2,
          description: 'Image failed',
          isForMainFrame: false,
        ),
      );
      await tester.pump();
      expect(find.text('Let’s reconnect your journey'), findsNothing);
      platform.delegate.error!(
        const WebResourceError(
          errorCode: -2,
          description: 'Offline',
          isForMainFrame: true,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Let’s reconnect your journey'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('View past delays without the map'));
      await tester.tap(find.text('View past delays without the map'));
      await tester.pumpAndSettle();
      expect(find.text('Native past delays'), findsOneWidget);
      router.pop();
      await tester.pumpAndSettle();
      expect(find.text('Let’s reconnect your journey'), findsOneWidget);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );
}

class _WorkspacePlatform extends WebViewPlatform {
  late _WorkspaceController controller;
  late _WorkspaceDelegate delegate;
  @override
  PlatformWebViewController createPlatformWebViewController(
    PlatformWebViewControllerCreationParams params,
  ) => controller = _WorkspaceController(params, this);
  @override
  PlatformNavigationDelegate createPlatformNavigationDelegate(
    PlatformNavigationDelegateCreationParams params,
  ) => delegate = _WorkspaceDelegate(params);
  @override
  PlatformWebViewWidget createPlatformWebViewWidget(
    PlatformWebViewWidgetCreationParams params,
  ) => _WorkspaceWidget(params);
}

class _WorkspaceController extends PlatformWebViewController {
  _WorkspaceController(super.params, this.owner) : super.implementation();
  final _WorkspacePlatform owner;
  final history = <Uri>[];
  final scripts = <String>[];
  final channels = <String, JavaScriptChannelParams>{};
  int loads = 0, backs = 0, reloads = 0;
  Completer<void>? backBarrier;
  @override
  Future<void> setJavaScriptMode(JavaScriptMode mode) async {}
  @override
  Future<void> setPlatformNavigationDelegate(
    PlatformNavigationDelegate handler,
  ) async {}
  @override
  Future<void> addJavaScriptChannel(JavaScriptChannelParams params) async {
    channels[params.name] = params;
  }

  @override
  Future<void> loadRequest(LoadRequestParams params) async {
    loads++;
    history.add(params.uri);
  }

  @override
  Future<void> reload() async {
    reloads++;
  }

  @override
  Future<String?> currentUrl() async =>
      history.isEmpty ? null : history.last.toString();
  @override
  Future<bool> canGoBack() async => history.length > 1;
  @override
  Future<void> goBack() async {
    backs++;
    await backBarrier?.future;
    if (history.length > 1) history.removeLast();
    owner.delegate.urlChanged?.call(UrlChange(url: history.last.toString()));
  }

  @override
  Future<void> runJavaScript(String script) async {
    scripts.add(script);
  }

  void finish() {
    owner.delegate.finished?.call(history.last.toString());
  }

  void visitMode(String mode) {
    history.add(
      history.last.replace(
        queryParameters: {...history.last.queryParameters, 'mode': mode},
      ),
    );
    channels['JourneyNavigation']!.onMessageReceived(
      const JavaScriptMessage(message: 'changed'),
    );
  }
}

class _WorkspaceDelegate extends PlatformNavigationDelegate {
  _WorkspaceDelegate(super.params) : super.implementation();
  NavigationRequestCallback? navigation;
  PageEventCallback? finished;
  WebResourceErrorCallback? error;
  UrlChangeCallback? urlChanged;
  @override
  Future<void> setOnNavigationRequest(
    NavigationRequestCallback callback,
  ) async {
    navigation = callback;
  }

  @override
  Future<void> setOnPageStarted(PageEventCallback callback) async {}
  @override
  Future<void> setOnPageFinished(PageEventCallback callback) async {
    finished = callback;
  }

  @override
  Future<void> setOnProgress(ProgressCallback callback) async {}
  @override
  Future<void> setOnWebResourceError(WebResourceErrorCallback callback) async {
    error = callback;
  }

  @override
  Future<void> setOnHttpError(HttpResponseErrorCallback callback) async {}
  @override
  Future<void> setOnUrlChange(UrlChangeCallback callback) async {
    urlChanged = callback;
  }
}

class _WorkspaceWidget extends PlatformWebViewWidget {
  _WorkspaceWidget(super.params) : super.implementation();
  @override
  Widget build(BuildContext context) =>
      const SizedBox.expand(key: Key('embedded-journey-tools'));
}
