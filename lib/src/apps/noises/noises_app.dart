import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'noise_engine.dart';

class _NatureClip {
  const _NatureClip(this.path, this.label);

  final String path;
  final String label;
}

const List<_NatureClip> _natureClips = <_NatureClip>[
  _NatureClip(
    'audio/nature/woodland_birdsong_rain.mp3',
    'Woodland birdsong and rain',
  ),
  _NatureClip('audio/nature/forest_rain.mp3', 'Forest rain'),
];

class NoisesApp extends StatefulWidget {
  const NoisesApp({super.key});

  @override
  State<NoisesApp> createState() => _NoisesAppState();
}

class _NoisesAppState extends State<NoisesApp> {
  static const String _preferencesKey = 'noises_v1';

  final AudioPlayer _noisePlayer = AudioPlayer();
  final AudioPlayer _naturePlayer = AudioPlayer();
  final Random _random = Random();

  NoiseColor _selected = NoiseColor.white;
  bool _loaded = false;
  bool _playing = false;
  bool _natureMix = false;
  bool _starting = false;
  double _volume = 0.72;
  _NatureClip? _activeNatureClip;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  @override
  void dispose() {
    _noisePlayer.dispose();
    _naturePlayer.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    final String? raw = await LocalStore.readString(_preferencesKey);
    if (!mounted) {
      return;
    }

    if (raw != null) {
      try {
        final Map<String, dynamic> json =
            jsonDecode(raw) as Map<String, dynamic>;
        final String? colorName = json['color'] as String?;
        if (colorName != null) {
          _selected = NoiseColor.values.firstWhere(
            (NoiseColor color) => color.name == colorName,
            orElse: () => NoiseColor.white,
          );
        }
        _natureMix = json['natureMix'] as bool? ?? false;
        _volume = ((json['volume'] as num?)?.toDouble() ?? 0.72)
            .clamp(0.0, 1.0)
            .toDouble();
      } on FormatException {
        // Fall back to the defaults when a stored value is malformed.
      }
    }

    setState(() => _loaded = true);
  }

  Future<void> _savePreferences() async {
    await LocalStore.writeString(
      _preferencesKey,
      jsonEncode(<String, Object>{
        'color': _selected.name,
        'natureMix': _natureMix,
        'volume': _volume,
      }),
    );
  }

  Future<void> _selectColor(NoiseColor color) async {
    if (_selected == color) {
      return;
    }

    setState(() => _selected = color);
    await _savePreferences();

    if (_playing) {
      await _stopPlayers();
      await _startPlayers();
    }
  }

  Future<void> _togglePlayback() async {
    if (_starting) {
      return;
    }

    if (_playing) {
      await _stopPlayers();
      return;
    }

    await _startPlayers();
  }

  Future<void> _startPlayers() async {
    setState(() {
      _starting = true;
      _activeNatureClip = _selected == NoiseColor.green && _natureMix
          ? _randomNatureClip()
          : null;
    });

    try {
      await _noisePlayer.setReleaseMode(ReleaseMode.loop);
      final Uint8List wavBytes = NoiseEngine.generateWav(_selected);
      await _noisePlayer.play(
        BytesSource(wavBytes, mimeType: 'audio/wav'),
        volume: _volume,
        mode: PlayerMode.lowLatency,
      );

      if (_activeNatureClip != null) {
        await _naturePlayer.setReleaseMode(ReleaseMode.loop);
        await _naturePlayer.play(
          AssetSource(_activeNatureClip!.path),
          volume: _volume * 0.42,
          mode: PlayerMode.mediaPlayer,
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Noise playback is not available yet.')),
        );
      }
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _playing = true;
      _starting = false;
    });
  }

  Future<void> _stopPlayers() async {
    await Future.wait<void>(<Future<void>>[
      _noisePlayer.stop(),
      _naturePlayer.stop(),
    ]);
    if (!mounted) {
      return;
    }

    setState(() {
      _playing = false;
      _starting = false;
      _activeNatureClip = null;
    });
  }

  Future<void> _setNatureMix(bool value) async {
    setState(() => _natureMix = value);
    await _savePreferences();

    if (_playing) {
      await _naturePlayer.stop();
      setState(() => _activeNatureClip = null);

      if (value && _selected == NoiseColor.green) {
        final _NatureClip clip = _randomNatureClip();
        setState(() => _activeNatureClip = clip);
        try {
          await _naturePlayer.setReleaseMode(ReleaseMode.loop);
          await _naturePlayer.play(
            AssetSource(clip.path),
            volume: _volume * 0.42,
            mode: PlayerMode.mediaPlayer,
          );
        } catch (_) {
          // Nature playback is optional; the generated noise keeps playing.
        }
      }
    } else if (value && _selected == NoiseColor.green) {
      setState(() => _activeNatureClip = _randomNatureClip());
    }
  }

  Future<void> _setVolume(double value) async {
    setState(() => _volume = value);
    await _savePreferences();

    if (_playing) {
      await Future.wait<void>(<Future<void>>[
        _noisePlayer.setVolume(value),
        _naturePlayer.setVolume(value * 0.42),
      ]);
    }
  }

  _NatureClip _randomNatureClip() {
    return _natureClips[_random.nextInt(_natureClips.length)];
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Noises',
      icon: Icons.graphic_eq_rounded,
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 96),
              children: <Widget>[
                _PlaybackCard(
                  selected: _selected,
                  playing: _playing,
                  starting: _starting,
                  volume: _volume,
                  onTogglePlayback: _togglePlayback,
                  onVolumeChanged: _setVolume,
                ),
                const SizedBox(height: 26),
                Text(
                  'Noise color',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                Text(
                  'Choose a color from the full noise spectrum.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: <Widget>[
                    for (final NoiseColor color in NoiseColor.values)
                      _NoiseColorTile(
                        color: color,
                        selected: _selected == color,
                        onTap: () => _selectColor(color),
                      ),
                  ],
                ),
                if (_selected == NoiseColor.green) ...<Widget>[
                  const SizedBox(height: 18),
                  _NatureMixCard(
                    value: _natureMix,
                    activeClip: _activeNatureClip,
                    onChanged: _setNatureMix,
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  'Nature clips are bundled from Wikimedia Commons and used '
                  'under Creative Commons BY-SA 4.0. Attribution details are in '
                  'the project README.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
    );
  }
}

class _PlaybackCard extends StatelessWidget {
  const _PlaybackCard({
    required this.selected,
    required this.playing,
    required this.starting,
    required this.volume,
    required this.onTogglePlayback,
    required this.onVolumeChanged,
  });

  final NoiseColor selected;
  final bool playing;
  final bool starting;
  final double volume;
  final VoidCallback onTogglePlayback;
  final ValueChanged<double> onVolumeChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color accent = _noiseColor(selected, scheme.brightness);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: accent.withValues(alpha: 0.28)),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: accent.withValues(alpha: 0.12),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(
                  playing
                      ? Icons.graphic_eq_rounded
                      : Icons.graphic_eq_outlined,
                  color: accent,
                  size: 30,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      '${selected.label} noise',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      selected.description,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton.icon(
              onPressed: starting ? null : onTogglePlayback,
              style: FilledButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: _onAccent(accent),
                disabledBackgroundColor: scheme.surfaceContainerHighest,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              icon: starting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.4),
                    )
                  : Icon(
                      playing ? Icons.stop_rounded : Icons.play_arrow_rounded,
                    ),
              label: Text(
                starting
                    ? 'Starting'
                    : playing
                    ? 'Stop'
                    : 'Play ${selected.label.toLowerCase()}',
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: <Widget>[
              const Icon(Icons.volume_down_rounded, size: 20),
              Expanded(
                child: Slider(
                  value: volume,
                  onChanged: onVolumeChanged,
                  activeColor: accent,
                ),
              ),
              const Icon(Icons.volume_up_rounded, size: 20),
            ],
          ),
        ],
      ),
    );
  }
}

class _NoiseColorTile extends StatelessWidget {
  const _NoiseColorTile({
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final NoiseColor color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color accent = _noiseColor(color, scheme.brightness);
    final Color foreground = selected ? _onAccent(accent) : scheme.onSurface;

    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: BoxDecoration(
          color: selected ? accent : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? accent : scheme.outlineVariant,
            width: 1.4,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: selected ? foreground : accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 9),
                Text(
                  color.label,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: foreground,
                    fontWeight: FontWeight.w700,
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

class _NatureMixCard extends StatelessWidget {
  const _NatureMixCard({
    required this.value,
    required this.activeClip,
    required this.onChanged,
  });

  final bool value;
  final _NatureClip? activeClip;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color accent = _noiseColor(NoiseColor.green, scheme.brightness);

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 10, 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.24)),
      ),
      child: SwitchListTile.adaptive(
        value: value,
        onChanged: onChanged,
        activeThumbColor: accent,
        activeTrackColor: accent.withValues(alpha: 0.35),
        contentPadding: EdgeInsets.zero,
        secondary: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(Icons.forest_rounded, color: accent),
        ),
        title: const Text('Nature mix'),
        subtitle: Text(
          value && activeClip != null
              ? 'Randomly mixing ${activeClip!.label}'
              : 'Randomly layer Creative Commons nature audio.',
        ),
      ),
    );
  }
}

Color _noiseColor(NoiseColor color, Brightness brightness) {
  switch (color) {
    case NoiseColor.white:
      return brightness == Brightness.dark
          ? const Color(0xFFF4F6F8)
          : const Color(0xFF54606E);
    case NoiseColor.pink:
      return const Color(0xFFE84A8A);
    case NoiseColor.brown:
      return const Color(0xFF9A5B32);
    case NoiseColor.blue:
      return const Color(0xFF2F80ED);
    case NoiseColor.violet:
      return const Color(0xFF8E5DFF);
    case NoiseColor.grey:
      return const Color(0xFF8A94A6);
    case NoiseColor.green:
      return const Color(0xFF1E9E5A);
  }
}

Color _onAccent(Color accent) {
  return ThemeData.estimateBrightnessForColor(accent) == Brightness.dark
      ? Colors.white
      : const Color(0xFF12151A);
}
