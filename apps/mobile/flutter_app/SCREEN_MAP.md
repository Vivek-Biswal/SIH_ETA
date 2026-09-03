# Mobile App — Flutter Route & Feature Mapping

Stitch Project: [labs.google.com/stitch/projects/13686356860913469551](https://labs.google.com/stitch/projects/13686356860913469551)

This document maps every Stitch design screen to its Flutter route name, feature folder, and primary widget file.

---

## Navigation Architecture

```
Bottom Navigation Bar (5 tabs):
├── Home          → /home
├── Search        → /search
├── Live          → /live
├── Notifications → /notifications
└── Profile       → /profile
```

App uses **GoRouter** for declarative routing and `flutter_riverpod` for state management.

---

## Screen-to-Route Mapping

| # | Screen Name | Flutter Route | Feature Folder | Primary Widget File |
|---|-------------|--------------|----------------|---------------------|
| 01 | Splash / Launch | `/` | `features/auth/` | `splash_screen.dart` |
| 02 | Onboarding | `/onboarding` | `features/auth/` | `onboarding_screen.dart` |
| 03 | Login | `/login` | `features/auth/` | `login_screen.dart` |
| 04 | Home | `/home` | `features/home/` | `home_screen.dart` |
| 05 | Search Trains | `/search` | `features/train_search/` | `search_screen.dart` |
| 06 | Search Results | `/search/results` | `features/train_search/` | `search_results_screen.dart` |
| 07 | Train Details | `/train/:trainNumber` | `features/train_search/` | `train_details_screen.dart` |
| 08 | Live Train Status | `/train/:trainNumber/live` | `features/eta/` | `live_status_screen.dart` |
| 09 | ETA Prediction | `/train/:trainNumber/eta` | `features/eta/` | `eta_prediction_screen.dart` |
| 10 | Station Timeline | `/train/:trainNumber/timeline` | `features/eta/` | `station_timeline_screen.dart` |
| 11 | Delay Explanation | (Modal Sheet) | `features/eta/` | `delay_explanation_sheet.dart` |
| 12 | Route Map View | `/train/:trainNumber/map` | `features/eta/` | `route_map_screen.dart` |
| 13 | Saved/Recent Trains | `/trains/saved` | `features/home/` | `saved_trains_screen.dart` |
| 14 | Notifications Feed | `/notifications` | `features/notifications/` | `notifications_screen.dart` |
| 15 | Notification Prefs | `/notifications/preferences` | `features/notifications/` | `notification_preferences_screen.dart` |
| 16 | Profile | `/profile` | `features/profile/` | `profile_screen.dart` |
| 17 | Settings | `/settings` | `features/profile/` | `settings_screen.dart` |
| 18 | Error / Offline | (Widget, not route) | `shared/widgets/` | `error_states.dart` |

---

## Feature Folder Structure

```
apps/mobile/flutter_app/lib/
├── core/
│   ├── router/
│   │   └── app_router.dart           # GoRouter config with all routes
│   ├── theme/
│   │   ├── app_colors.dart           # Design tokens: Canvas Black, Live Green, etc.
│   │   ├── app_typography.dart       # Geist + JetBrains Mono text styles
│   │   └── app_theme.dart            # ThemeData wrapping all tokens
│   └── widgets/
│       ├── status_badge.dart         # Live Green / Warning Amber / Critical Red badges
│       ├── eta_display.dart          # Large monospace ETA hero widget
│       ├── route_timeline.dart       # Vertical station timeline track
│       ├── train_card.dart           # Reusable train summary card
│       └── skeleton_loader.dart      # Shimmer skeletons for loading states
│
├── features/
│   ├── auth/
│   │   ├── splash_screen.dart
│   │   ├── onboarding_screen.dart
│   │   └── login_screen.dart
│   ├── home/
│   │   ├── home_screen.dart
│   │   └── saved_trains_screen.dart
│   ├── train_search/
│   │   ├── search_screen.dart
│   │   ├── search_results_screen.dart
│   │   └── train_details_screen.dart
│   ├── eta/
│   │   ├── live_status_screen.dart
│   │   ├── eta_prediction_screen.dart
│   │   ├── station_timeline_screen.dart
│   │   ├── delay_explanation_sheet.dart
│   │   └── route_map_screen.dart
│   ├── notifications/
│   │   ├── notifications_screen.dart
│   │   └── notification_preferences_screen.dart
│   └── profile/
│       ├── profile_screen.dart
│       └── settings_screen.dart
│
└── shared/
    ├── models/                       # Dart data classes mirroring API contracts
    │   ├── train.dart
    │   ├── eta_prediction.dart
    │   └── station_status.dart
    ├── services/
    │   ├── api_service.dart
    │   └── websocket_service.dart
    └── widgets/
        └── error_states.dart         # OfflineState, DataErrorState, EmptyResultState
```

---

## Design Token Mapping (Stitch → Flutter/Dart)

| Design Token | Flutter Color Const | Value |
|---|---|---|
| Canvas Black | `AppColors.canvasBlack` | `Color(0xFF09090B)` |
| Surface Zinc | `AppColors.surfaceZinc` | `Color(0xFF18181B)` |
| Whisper Border | `AppColors.whisperBorder` | `Color(0x1AFFFFFF)` |
| Pure White | `AppColors.pureWhite` | `Color(0xFFFFFFFF)` |
| Muted Steel | `AppColors.mutedSteel` | `Color(0xFFA1A1AA)` |
| Live Green | `AppColors.liveGreen` | `Color(0xFF22C55E)` |
| Warning Amber | `AppColors.warningAmber` | `Color(0xFFF59E0B)` |
| Critical Red | `AppColors.criticalRed` | `Color(0xFFEF4444)` |
| Brand Blue | `AppColors.brandBlue` | `Color(0xFF3B82F6)` |

---

## Key Flutter Implementation Notes

1. **Monospace data** — Use `GoogleFonts.jetBrainsMono()` for all ETA, delay, and train number `Text` widgets.
2. **Live pulse dot** — `AnimationController` with `Tween<double>(begin: 1.0, end: 0.4)` on opacity, repeating indefinitely.
3. **Timeline track** — `CustomPainter` for the vertical connecting line; station nodes are `Container` widgets with conditional `BoxDecoration`.
4. **Delay bottom sheet** — `showModalBottomSheet` with `backgroundColor: AppColors.surfaceZinc` and `borderRadius: BorderRadius.vertical(top: Radius.circular(12))`.
5. **Map placeholder** — `Container` with `AppColors.canvasBlack` + `CustomPaint` route line until Mapbox is integrated.
6. **WebSocket updates** — `StreamBuilder` on `live_status_screen.dart` and `eta_prediction_screen.dart`.
7. **Error states** — `error_states.dart` exports: `OfflineState`, `DataErrorState`, `EmptyResultState` — composable into any screen.
