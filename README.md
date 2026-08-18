# One Hub

A polished, fast cross-platform hub for a growing collection of small apps.
The project targets iOS first while remaining ready for Android and web through
Flutter's single codebase.

## Current apps

- **Tasks** — numbered Today priorities, an All view, drag ordering, and nested subtasks.
- **Prompts** — reusable titles and notes with one-tap copy without the title.
- **Maths** — configurable arithmetic challenges with count and timed modes.
- **Routines** — repeatable routines with step-by-step daily progress and optional clock times for steps.
- **Focus** — named focus/break timers with an optional extra check-in timer and background completion alerts.
- **Noises** — colored-noise soundscapes with independently toggleable Creative Commons nature layers.
- **Afterimage** — an endless, procedural time-heist where each rewind records an echo that can distract guards, hold switches, and help crack the next vault.
- **Workouts** — a private weekly strength planner with age-aware programming, active set logging, and Resolve-versus-Pressure ratings.

Tasks, prompts, routines, workout plans/history, Maths scores, and
recently opened hub cards are saved locally with `shared_preferences`.

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
        ├── tasks/             # Tasks module
        ├── prompts/           # Reusable prompts module
        ├── maths/             # Maths practice module
        ├── routines/          # Routines tracker module
        ├── focus/             # Focus timer module
        ├── noises/            # Colored noise and nature mix module
        ├── afterimage/        # Procedural time-heist game and simulation
        └── workouts/          # Local workout planner and Resolve rating
```

## Audio credits

The Noises app bundles four nature ambience loops from Wikimedia Commons:

- `woodland_birdsong_rain.mp3` — "Bourne woods Birdsong and rain" by Robert EA
  Harvey, licensed under CC BY-SA 4.0.
- `forest_rain.mp3` — "Bourne woods rain" by Robert EA Harvey, licensed under
  CC BY-SA 4.0.
- `stream_sesmylspruit.mp3` — "Sound of the Sesmyl Spruit" by JMK, licensed
  under CC BY-SA 4.0.
- `river_palala.mp3` — "Sound of the Palala River" by JMK, licensed under
  CC BY-SA 4.0.

License links:

- <https://creativecommons.org/licenses/by-sa/4.0/>

Source pages:

- <https://commons.wikimedia.org/wiki/File:Bourne_woods_Birdsong_and_rain_2020-06-17_0742.mp3>
- <https://commons.wikimedia.org/wiki/File:Bourne_woods_rain_2020-05-10_0800.mp3>
- <https://commons.wikimedia.org/wiki/File:Sesmylspruit,_klank_van_stroom_by_bruggie,_a.mp3>
- <https://commons.wikimedia.org/wiki/File:Palalarivier,_klank_van_sterk_stroom,_a.mp3>

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
