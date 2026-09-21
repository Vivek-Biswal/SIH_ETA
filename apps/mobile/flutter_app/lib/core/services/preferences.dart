import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final preferencesProvider = Provider<SharedPreferences?>((ref) => null);
final appearanceProvider = NotifierProvider<Appearance, ThemeMode>(
  Appearance.new,
);

class Appearance extends Notifier<ThemeMode> {
  @override
  ThemeMode build() =>
      switch (ref.read(preferencesProvider)?.getString('appearance')) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await ref.read(preferencesProvider)?.setString('appearance', mode.name);
  }
}

final historyProvider = NotifierProvider<SearchHistory, List<String>>(
  SearchHistory.new,
);

class SearchHistory extends Notifier<List<String>> {
  @override
  List<String> build() =>
      ref.read(preferencesProvider)?.getStringList('train_history') ?? [];
  Future<void> add(String number) async {
    state = [number, ...state.where((n) => n != number)].take(8).toList();
    await ref.read(preferencesProvider)?.setStringList('train_history', state);
  }

  Future<void> clear() async {
    state = [];
    await ref.read(preferencesProvider)?.remove('train_history');
  }
}
