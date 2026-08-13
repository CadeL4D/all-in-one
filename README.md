# One Hub

A polished, fast cross-platform hub for a growing collection of small apps.
The project targets iOS first while remaining ready for Android and web through
Flutter's single codebase.

## Current apps

- **Notes** — create, edit, and swipe-to-delete quick notes.
- **Tasks** — a lightweight to-do list with completion progress.
- **Calculator** — a distraction-free basic calculator.
- **Focus** — a work/break timer for short focus sessions.

## Project structure

```text
lib/
├── main.dart                  # App entry point
└── src/
    ├── app.dart               # MaterialApp, routes, and theme wiring
    ├── core/
    │   └── app_manifest.dart  # App metadata model
    ├── theme/
    │   └── app_theme.dart     # Light/dark theme tokens
    ├── screens/
    │   ├── hub_screen.dart    # Responsive searchable app grid
    │   └── app_scaffold.dart  # Shared app bar/shell for modules
    └── apps/
        ├── apps_registry.dart # Registry powering the hub
        ├── notes/             # Notes module
        ├── tasks/             # Tasks module
        ├── calculator/        # Calculator module
        └── focus/             # Focus timer module
```

## Adding an app

1. Create a widget under `lib/src/apps/<app_id>/`.
2. Add an `AppManifest` entry in `lib/src/apps/apps_registry.dart`.
3. The hub grid, search, category filters, and routes update automatically.

## Run

```bash
flutter pub get
flutter run
```

For a specific target:

```bash
flutter run -d ios
flutter run -d android
flutter run -d chrome
```

## Test and analyze

```bash
flutter test
flutter analyze
```

## Unsigned iOS IPA releases

The `Build unsigned iOS IPA` workflow builds `Runner-unsigned.ipa` without code
signing and attaches it to a GitHub Release.

- Push a `v*` tag to build from that tag.
- Or run the workflow manually from the **Actions** tab; it creates a new
  release named `Unsigned iOS build <run-number>`.
- The IPA is also available as a workflow artifact.

An unsigned IPA is useful for distribution and inspection, but it cannot be
installed on a device until it is signed with an Apple development or
distribution identity.
