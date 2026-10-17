import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

final appRouteObserver = RouteObserver<ModalRoute<dynamic>>();

/// Keep explicit AppBar actions consistent with the router's system Back.
/// Direct links have Search beneath them; a standalone screen can still
/// safely return there without attempting to pop an empty Navigator.
void backToPreviousScreen(BuildContext context) {
  final router = GoRouter.of(context);
  if (router.canPop()) {
    router.pop();
  } else if (GoRouterState.of(context).uri.path != '/') {
    router.go('/');
  }
}
