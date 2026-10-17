import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/navigation/app_navigation.dart';
import '../explore/explore_screen.dart';
import 'journey_export.dart';

/// Shares all journey tools without duplicating the embedded mode selector.
class JourneyWorkspaceScreen extends StatefulWidget {
  const JourneyWorkspaceScreen({super.key});
  @override
  State<JourneyWorkspaceScreen> createState() => _JourneyWorkspaceScreenState();
}

enum _WorkspaceAction { refresh, pastDelays, browser }

class _JourneyWorkspaceScreenState extends State<JourneyWorkspaceScreen>
    with WidgetsBindingObserver, RouteAware {
  static final _baseUrl = Uri.parse(
    const String.fromEnvironment(
      'JOURNEY_WEB_BASE_URL',
      defaultValue: 'https://equinox01.vercel.app',
    ),
  ).resolve('/journey-insights');
  WebViewController? _controller;
  ModalRoute<dynamic>? _route;
  Uri? _workspaceUrl;
  int _progress = 0;
  String? _error;
  String? _theme;
  bool _ready = false;
  bool _webCanGoBack = false;
  bool _handlingBack = false;
  bool _openingNativeScreen = false;
  bool _sharing = false;
  bool _requestedInitialPage = false;

  Future<void> _exportJourney(JavaScriptMessage message) async {
    if (_sharing) return;
    _sharing = true;
    try {
      final current = Uri.tryParse(await _controller?.currentUrl() ?? '');
      if (current?.origin != _baseUrl.origin || !mounted) return;
      final file = parseJourneyExport(message.message);
      final box = context.findRenderObject() as RenderBox?;
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile.fromData(utf8.encode(file.csv), mimeType: 'text/csv')],
          fileNameOverrides: [file.filename],
          sharePositionOrigin: box == null
              ? null
              : box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } catch (_) {
      _showMessage('Could not export this journey. Please try again.');
    } finally {
      _sharing = false;
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (_baseUrl.scheme != 'https' || _baseUrl.host.isEmpty) {
      _error = 'The journey website must use a valid HTTPS address.';
      return;
    }
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('JourneyExport', onMessageReceived: _exportJourney)
      ..addJavaScriptChannel(
        'JourneyNavigation',
        onMessageReceived: (_) => _updateWebHistory(),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) {
            if (mounted) setState(() => _progress = value);
          },
          onPageStarted: (_) {
            if (mounted) {
              setState(() {
                _error = null;
                _ready = false;
                _progress = 0;
              });
            }
          },
          onPageFinished: (_) {
            if (mounted && _error == null) {
              setState(() {
                _ready = true;
                _progress = 100;
              });
              _updateWebHistory();
              _applyTheme();
              _syncLifecycle();
            }
          },
          onUrlChange: (_) => _updateWebHistory(),
          onWebResourceError: (error) {
            if (mounted && error.isForMainFrame == true) {
              setState(
                () => _error =
                    'Check your internet connection and try again. Your other train tools are still available.',
              );
            }
          },
          onHttpError: (error) {
            final uri = error.request?.uri;
            if (mounted &&
                uri?.origin == _baseUrl.origin &&
                uri?.path == _baseUrl.path) {
              setState(
                () => _error =
                    'Journey insights is temporarily unavailable. Please try again in a moment.',
              );
            }
          },
          onNavigationRequest: _navigate,
        ),
      );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != _route) {
      appRouteObserver.unsubscribe(this);
      _route = route;
      if (route != null) appRouteObserver.subscribe(this, route);
    }
    final theme = Theme.of(context).brightness == Brightness.dark
        ? 'dark'
        : 'light';
    if (_theme == theme) return;
    _theme = theme;
    _workspaceUrl = _baseUrl.replace(
      queryParameters: {'embed': 'mobile', 'theme': theme},
    );
    if (_controller == null) return;
    if (!_requestedInitialPage) {
      _requestedInitialPage = true;
      unawaited(_loadWorkspace());
    } else if (_ready) {
      // Keep the selected train and simulation when app appearance changes.
      _applyTheme();
    }
  }

  void _applyTheme() {
    _controller
        ?.runJavaScript(
          "window.dispatchEvent(new CustomEvent('journey-theme', {detail: '$_theme'}));",
        )
        .catchError((_) {});
  }

  NavigationDecision _navigate(NavigationRequest request) {
    final target = Uri.tryParse(request.url);
    if (target == null || target.scheme != 'https') {
      return NavigationDecision.prevent;
    }
    if (target.origin == _baseUrl.origin) {
      if (RegExp(r'^/trains/\d{5}$').hasMatch(target.path)) {
        unawaited(
          _openNativeScreen(
            '${target.path}${target.hasQuery ? '?${target.query}' : ''}',
          ),
        );
        return NavigationDecision.prevent;
      }
      return NavigationDecision.navigate;
    }
    unawaited(_openBrowser(target));
    return NavigationDecision.prevent;
  }

  Future<void> _openNativeScreen(String path) async {
    if (!mounted || _openingNativeScreen) return;
    _openingNativeScreen = true;
    try {
      await context.push(path);
    } finally {
      _openingNativeScreen = false;
    }
  }

  Future<void> _updateWebHistory() async {
    final controller = _controller;
    if (controller == null) return;
    try {
      final canGoBack = await controller.canGoBack();
      if (mounted && canGoBack != _webCanGoBack) {
        setState(() => _webCanGoBack = canGoBack);
      }
    } catch (_) {
      // A disposed platform view must not prevent leaving this screen.
    }
  }

  Future<void> _handleBack() async {
    if (_handlingBack ||
        !mounted ||
        ModalRoute.of(context)?.isCurrent != true) {
      return;
    }
    _handlingBack = true;
    try {
      final controller = _controller;
      if (controller != null && await controller.canGoBack()) {
        if (!mounted || ModalRoute.of(context)?.isCurrent != true) return;
        await controller.goBack();
        await _updateWebHistory();
        return;
      }
    } catch (_) {
      // If WebView has been torn down, use native navigation history.
    } finally {
      _handlingBack = false;
    }
    if (mounted && ModalRoute.of(context)?.isCurrent == true) {
      backToPreviousScreen(context);
    }
  }

  Future<void> _loadWorkspace({bool reload = false}) async {
    final controller = _controller;
    final url = _workspaceUrl;
    if (controller == null || url == null) return;
    setState(() {
      _error = null;
      _progress = 0;
      _ready = false;
    });
    try {
      // Refresh the current mode instead of resetting it to tab one.
      if (reload && await controller.currentUrl() != null) {
        await controller.reload();
      } else {
        await controller.loadRequest(url);
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'The journey tools could not open. Please try again.',
        );
      }
    }
  }

  Future<void> _openBrowser([Uri? target]) async {
    try {
      final opened = await launchUrl(
        target ?? _workspaceUrl ?? _baseUrl,
        mode: LaunchMode.externalApplication,
      );
      if (!opened) _showMessage('No browser is available to open this page.');
    } catch (_) {
      _showMessage('Could not open a browser. Please try again.');
    }
  }

  void _showMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  void _sendLifecycleEvent(String event) {
    _controller
        ?.runJavaScript("window.dispatchEvent(new Event('$event'));")
        .catchError((_) {});
  }

  void _syncLifecycle() {
    final state = WidgetsBinding.instance.lifecycleState;
    final active =
        mounted &&
        _route?.isCurrent == true &&
        (state == null || state == AppLifecycleState.resumed);
    _sendLifecycleEvent(active ? 'journey-resume' : 'journey-pause');
  }

  @override
  void didPush() => _syncLifecycle();

  @override
  void didPushNext() => _sendLifecycleEvent('journey-pause');

  @override
  void didPopNext() {
    _syncLifecycle();
    _updateWebHistory();
  }

  @override
  void didPop() => _sendLifecycleEvent('journey-pause');

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _syncLifecycle();
  }

  @override
  void dispose() {
    appRouteObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return PopScope<Object?>(
      canPop: !_webCanGoBack,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _webCanGoBack) unawaited(_handleBack());
      },
      child: Scaffold(
        appBar: AppBar(
          leading: BackButton(onPressed: _handleBack),
          titleSpacing: 0,
          title: Text(
            'Journey insights',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontSize: 19,
              fontWeight: FontWeight.w700,
              letterSpacing: -.3,
            ),
          ),
          actions: [
            PopupMenuButton<_WorkspaceAction>(
              tooltip: 'Journey options',
              onSelected: (action) {
                switch (action) {
                  case _WorkspaceAction.refresh:
                    unawaited(_loadWorkspace(reload: true));
                  case _WorkspaceAction.pastDelays:
                    unawaited(_openNativeScreen('/network'));
                  case _WorkspaceAction.browser:
                    unawaited(_openBrowser());
                }
              },
              itemBuilder: (_) => [
                if (_controller != null)
                  const PopupMenuItem(
                    value: _WorkspaceAction.refresh,
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.refresh_rounded),
                      title: Text('Refresh this view'),
                    ),
                  ),
                const PopupMenuItem(
                  value: _WorkspaceAction.pastDelays,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.history_rounded),
                    title: Text('Past delays without the map'),
                  ),
                ),
                const PopupMenuItem(
                  value: _WorkspaceAction.browser,
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.open_in_new_rounded),
                    title: Text('Open in browser'),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 6),
          ],
        ),
        bottomNavigationBar: const AppNavigation(selected: 2),
        body: SafeArea(
          top: false,
          child: _error != null
              ? _WorkspaceMessage(
                  icon: Icons.wifi_off_rounded,
                  title: 'Let’s reconnect your journey',
                  message: _error!,
                  primaryLabel: 'Try again',
                  onPrimary: _controller == null
                      ? null
                      : () => _loadWorkspace(reload: true),
                  onPastDelays: () => _openNativeScreen('/network'),
                  onBrowser: _openBrowser,
                )
              : _controller == null
              ? _WorkspaceMessage(
                  icon: Icons.route_rounded,
                  title: 'Your journey tools are ready',
                  message:
                      'Open the journey workspace in your browser to track a train, explore past delays or try a simulation.',
                  primaryLabel: 'Open journey tools',
                  onPrimary: _openBrowser,
                  onPastDelays: () => _openNativeScreen('/network'),
                )
              : Stack(
                  children: [
                    Offstage(
                      offstage: !_ready,
                      child: WebViewWidget(controller: _controller!),
                    ),
                    if (!_ready) const _WorkspaceLoading(),
                    if (!_ready)
                      Positioned(
                        top: 0,
                        left: 0,
                        right: 0,
                        child: LinearProgressIndicator(
                          minHeight: 2,
                          value: _progress == 0 ? null : _progress / 100,
                          backgroundColor: colors.surfaceContainerHighest,
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _WorkspaceLoading extends StatelessWidget {
  const _WorkspaceLoading();
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                Icons.route_rounded,
                color: colors.onPrimaryContainer,
                size: 32,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Opening journey insights',
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Train tracking, past delays and simulations\nin one place.',
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.onSurfaceVariant, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkspaceMessage extends StatelessWidget {
  const _WorkspaceMessage({
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryLabel,
    required this.onPrimary,
    required this.onPastDelays,
    this.onBrowser,
  });
  final IconData icon;
  final String title;
  final String message;
  final String primaryLabel;
  final VoidCallback? onPrimary;
  final VoidCallback onPastDelays;
  final VoidCallback? onBrowser;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: colors.outlineVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colors.primaryContainer,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: colors.onPrimaryContainer, size: 26),
                ),
                const SizedBox(height: 24),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -.4,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  message,
                  style: TextStyle(color: colors.onSurfaceVariant, height: 1.6),
                ),
                const SizedBox(height: 24),
                if (onPrimary != null)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: onPrimary,
                      child: Text(primaryLabel, textAlign: TextAlign.center),
                    ),
                  ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: onPastDelays,
                    child: const Text(
                      'View past delays without the map',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                if (onBrowser != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: TextButton.icon(
                      onPressed: onBrowser,
                      icon: const Icon(Icons.open_in_new_rounded, size: 16),
                      label: const Text('Open in browser'),
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
