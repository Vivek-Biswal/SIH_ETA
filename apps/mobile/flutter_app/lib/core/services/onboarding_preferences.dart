import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'preferences.dart';

/// Kept on this device so the welcome guide appears only on first launch.
final onboardingProvider = NotifierProvider<OnboardingPreferences, bool>(
  OnboardingPreferences.new,
);

class OnboardingPreferences extends Notifier<bool> {
  static const completedKey = 'onboarding_completed';

  @override
  bool build() => ref.read(preferencesProvider)?.getBool(completedKey) ?? false;

  Future<void> complete() async {
    final written = await ref
        .read(preferencesProvider)
        ?.setBool(completedKey, true);
    if (written == false) throw StateError('Could not save guide preference');
    state = true;
  }
}
