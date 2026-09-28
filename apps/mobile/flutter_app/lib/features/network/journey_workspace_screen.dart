import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../explore/explore_screen.dart';

/// Shares the deployed journey workspace, including its map configuration.
class JourneyWorkspaceScreen extends StatefulWidget {
  const JourneyWorkspaceScreen({super.key});

  @override
  State<JourneyWorkspaceScreen> createState() => _JourneyWorkspaceScreenState();
}

class _JourneyWorkspaceScreenState extends State<JourneyWorkspaceScreen>
    with WidgetsBindingObserver {
  static final _url = Uri.parse(
    const String.fromEnvironment(
      'JOURNEY_WEB_BASE_URL',
      defaultValue: 'https://equinox01.vercel.app',
    ),
  ).resolve('/journey-insights');
  WebViewController? _controller;
  int _progress = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (_url.scheme != 'https' || _url.host.isEmpty) {
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
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) {
            if (mounted) setState(() => _progress = value);
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _error = null);
          },
          onWebResourceError: (error) {
            if (mounted && error.isForMainFrame == true) {
              setState(
                () => _error =
                    'Journey insights could not load. Check your connection and retry.',
              );
            }
          },
          onHttpError: (error) {
            if (mounted && error.request?.uri == _url) {
              setState(
                () => _error =
                    'The journey website is temporarily unavailable. Please retry.',
              );
            }
          },
          onNavigationRequest: (request) {
            final target = Uri.tryParse(request.url);
            if (target == null || target.scheme != 'https') {
              return NavigationDecision.prevent;
            }
            if (target.origin == _url.origin) {
              if (RegExp(r'^/trains/\d{5}$').hasMatch(target.path)) {
                if (mounted) {
                  _controller?.runJavaScript(
                    "window.dispatchEvent(new Event('journey-pause'));",
                  );
                  context
                      .push(
                        target.path +
                            (target.hasQuery ? '?${target.query}' : ''),
                      )
                      .then((_) {
                        if (mounted) {
                          _controller?.runJavaScript(
                            "window.dispatchEvent(new Event('journey-resume'));",
                          );
                        }
                      });
                }
                return NavigationDecision.prevent;
              }
              return NavigationDecision.navigate;
            }
            if (target.scheme == 'https') {
              launchUrl(target, mode: LaunchMode.externalApplication);
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(_url);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final event = state == AppLifecycleState.resumed
        ? 'journey-resume'
        : 'journey-pause';
    _controller
        ?.runJavaScript("window.dispatchEvent(new Event('$event'));")
        .catchError((_) {});
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Journey insights'),
      actions: [
        IconButton(
          tooltip: 'Open native past delay analysis',
          onPressed: () async {
            didChangeAppLifecycleState(AppLifecycleState.inactive);
            await context.push('/network');
            if (mounted) didChangeAppLifecycleState(AppLifecycleState.resumed);
          },
          icon: const Icon(Icons.history),
        ),
      ],
    ),
    bottomNavigationBar: const AppNavigation(selected: 2),
    body: SafeArea(
      child: _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        setState(() => _error = null);
                        _controller?.loadRequest(_url);
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : _controller == null
          ? Center(
              child: FilledButton(
                onPressed: () =>
                    launchUrl(_url, mode: LaunchMode.externalApplication),
                child: const Text('Open journey workspace'),
              ),
            )
          : Column(
              children: [
                if (_progress < 100)
                  LinearProgressIndicator(value: _progress / 100),
                Expanded(child: WebViewWidget(controller: _controller!)),
              ],
            ),
    ),
  );
}
