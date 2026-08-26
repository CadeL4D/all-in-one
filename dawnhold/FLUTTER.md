# Dawnhold in Flutter (WebView)

The whole game is one file — `onefile.html`. Drop it in a WebView and it runs.

## 1. Add the package

```bash
flutter pub add flutter_inappwebview
```

## 2. Copy the game into assets

```bash
mkdir -p assets
cp dawnhold/onefile.html assets/dawnhold.html
```

`pubspec.yaml`:

```yaml
flutter:
  assets:
    - assets/dawnhold.html
```

## 3. The screen

```dart
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class DawnholdScreen extends StatelessWidget {
  const DawnholdScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: InAppWebView(
        initialSettings: InAppWebViewSettings(
          javaScriptEnabled: true,
          supportZoom: false, // the game does its own pinch-zoom
        ),
        onWebViewCreated: (controller) => controller.loadFile('assets/dawnhold.html'),
      ),
    );
  }
}
```

That's it — fullscreen it, push it like any route.

## Saves

- The game saves to the WebView's `localStorage` (autosave + 3 slots).
  **No extra code needed** — `loadFile` gives it a proper origin, so saves
  persist across app restarts.
- Saves are lost if the app is **uninstalled** or WebView data is cleared.
- Updating the game (recopy `onefile.html`) keeps saves — the save keys
  don't change between versions.

## Updating the game later

```bash
cp dawnhold/onefile.html assets/dawnhold.html
flutter clean && flutter build
```
