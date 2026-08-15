import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../../core/local_store.dart';
import '../../screens/app_scaffold.dart';
import 'noise_engine.dart';

class _NatureClip {
  const _NatureClip({
    required this.id,
    required this.path,
    required this.label,
    required this.icon,
  });

  final String id;
  final String path;
  final String label;
  final IconData icon;
}

const List<_NatureClip> _natureClips = <_NatureClip>[
  _NatureClip(
    id: 'woodland_rain',
    path: 'audio/nature/woodland_birdsong_rain.mp3',
    label: 'Woodland birdsong and rain',
    icon: Icons.forest_rounded,
  ),
  _NatureClip(
    id: 'forest_rain',
    path: 'audio/nature/forest_rain.mp3',
    label: 'Forest rain',
    icon: Icons.water_drop_rounded,
  ),
  _NatureClip(
    id: 'stream',
    path: 'audio/nature/stream_sesmylspruit.mp3',
    label: 'Flowing stream',
    icon: Icons.water_rounded,
  ),
  _NatureClip(
    id: 'river_birds',
    path: 'audio/nature/river_palala.mp3',
    label: 'River and birds',
    icon: Icons.air_rounded,
  ),
];

class NoisesApp extends StatefulWidget {
  const NoisesApp({super.key});

  @override
  State<NoisesApp> createState() => _NoisesAppState();
}

class _NoisesAppState extends State<NoisesApp> {
  static const String _preferencesKey = 'noises_v1';

  final AudioPlayer _noisePlayer = AudioPlayer();
  final Map<String, AudioPlayer> _naturePlayers = <String, AudioPlayer>{};
  final Random _random = Random();

  NoiseColor _selected = NoiseColor.white;
  bool _loaded = false;
  bool _playing = false;
  bool _starting = false;
  double _volume = 0.72;
  double _natureVolume = 0.80;
  final Map<String, bool> _natureEnabled = <String, bool>{};
  final Set<String> _activeNatureIds = <String>{};
  Timer? _noiseVariationTimer;

  @override
  void initState() {
    super.initState();
    for (final _NatureClip clip in _natureClips) {
      _naturePlayers[clip.id] = AudioPlayer();
    }
    _loadPreferences();
  }

  @override
  void dispose() {
    _noiseVariationTimer?.cancel();
    _noisePlayer.dispose();
    for (final AudioPlayer player in _naturePlayers.values) {
      player.dispose();
    }
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
        final bool legacyNatureMix = json['natureMix'] as bool? ?? false;
        final Object? storedNature = json['natureEnabled'];
        if (storedNature is Map<String, dynamic>) {
          for (final _NatureClip clip in _natureClips) {
            _natureEnabled[clip.id] = storedNature[clip.id] as bool? ?? false;
          }
        } else {
          for (final _NatureClip clip in _natureClips) {
            _natureEnabled[clip.id] = legacyNatureMix;
          }
        }
        _volume = ((json['volume'] as num?)?.toDouble() ?? 0.72)
            .clamp(0.0, 1.0)
            .toDouble();
        _natureVolume = ((json['natureVolume'] as num?)?.toDouble() ?? 0.80)
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
        'natureEnabled': _natureEnabled,
        'volume': _volume,
        'natureVolume': _natureVolume,
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
    });

    try {
      await _noisePlayer.setReleaseMode(ReleaseMode.loop);
      final Uint8List wavBytes = NoiseEngine.generateWav(_selected);
      await _noisePlayer.play(
        BytesSource(wavBytes, mimeType: 'audio/wav'),
        volume: _volume,
        mode: PlayerMode.lowLatency,
      );

      if (_selected == NoiseColor.green) {
        for (final _NatureClip clip in _natureClips) {
          if (_natureEnabled[clip.id] ?? false) {
            await _startNatureClip(clip.id);
          }
        }
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
    _scheduleNoiseVariation();
  }

  Future<void> _stopPlayers() async {
    _noiseVariationTimer?.cancel();
    _noiseVariationTimer = null;
    await Future.wait<void>(<Future<void>>[
      _noisePlayer.stop(),
      ..._activeNatureIds.map((String id) => _naturePlayers[id]!.stop()),
    ]);
    if (!mounted) {
      return;
    }

    setState(() {
      _playing = false;
      _starting = false;
      _activeNatureIds.clear();
    });
  }

  Future<void> _setNatureEnabled(String id, bool value) async {
    setState(() => _natureEnabled[id] = value);
    await _savePreferences();

    if (_playing && _selected == NoiseColor.green) {
      if (value) {
        await _startNatureClip(id);
      } else {
        await _stopNatureClip(id);
      }
    }
  }

  Future<void> _startNatureClip(String id) async {
    if (_activeNatureIds.contains(id)) {
      return;
    }

    final _NatureClip clip = _natureClips.firstWhere(
      (_NatureClip clip) => clip.id == id,
    );
    final AudioPlayer player = _naturePlayers[id]!;
    try {
      await player.setReleaseMode(ReleaseMode.loop);
      await player.play(
        AssetSource(clip.path),
        volume: _natureVolume,
        mode: PlayerMode.mediaPlayer,
      );
      if (mounted) {
        setState(() => _activeNatureIds.add(id));
      } else {
        _activeNatureIds.add(id);
      }
    } catch (_) {
      // Nature playback is optional; the generated noise keeps playing.
    }
  }

  Future<void> _stopNatureClip(String id) async {
    if (_activeNatureIds.remove(id)) {
      try {
        await _naturePlayers[id]!.stop();
      } catch (_) {
        // A stopped nature layer needs no recovery.
      }
      if (mounted) {
        setState(() {});
      }
    }
  }

  void _scheduleNoiseVariation() {
    _noiseVariationTimer?.cancel();
    final int seconds = 90 + _random.nextInt(61);
    _noiseVariationTimer = Timer(Duration(seconds: seconds), () async {
      if (!_playing) {
        return;
      }

      try {
        final Uint8List wavBytes = NoiseEngine.generateWav(_selected);
        await _noisePlayer.play(
          BytesSource(wavBytes, mimeType: 'audio/wav'),
          volume: _volume,
          mode: PlayerMode.lowLatency,
        );
      } catch (_) {
        // The existing loop keeps playing when variation is unavailable.
      }
      if (!_playing) {
        return;
      }
      _scheduleNoiseVariation();
    });
  }

  Future<void> _setVolume(double value) async {
    setState(() => _volume = value);
    await _savePreferences();

    if (_playing) {
      await _noisePlayer.setVolume(_volume);
    }
  }

  Future<void> _setNatureVolume(double value) async {
    setState(() => _natureVolume = value);
    await _savePreferences();

    if (_playing) {
      for (final String id in _activeNatureIds) {
        try {
          await _naturePlayers[id]!.setVolume(_natureVolume);
        } catch (_) {
          // Keep the rest of the mix playing when one layer fails.
        }
      }
    }
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
                  _NatureLayersCard(
                    enabledIds: _natureEnabled,
                    activeIds: _activeNatureIds,
                    natureVolume: _natureVolume,
                    onChanged: _setNatureEnabled,
                    onVolumeChanged: _setNatureVolume,
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  'Nature clips are bundled from Wikimedia Commons and used '
                  'under Creative Commons BY-SA 4.0 or CC0/public-domain '
                  'licenses. Enabled sounds loop continuously over the steady '
                  'green noise. Attribution details are in the project README.',
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

class _NatureLayersCard extends StatelessWidget {
  const _NatureLayersCard({
    required this.enabledIds,
    required this.activeIds,
    required this.natureVolume,
    required this.onChanged,
    required this.onVolumeChanged,
  });

  final Map<String, bool> enabledIds;
  final Set<String> activeIds;
  final double natureVolume;
  final void Function(String id, bool value) onChanged;
  final ValueChanged<double> onVolumeChanged;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color accent = _noiseColor(NoiseColor.green, scheme.brightness);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 10, 10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.layers_rounded, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Nature layers',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Enabled sounds play continuously over green noise at '
                      'the nature volume you choose.',
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              Icon(Icons.volume_down_rounded, color: accent, size: 20),
              Expanded(
                child: Slider(
                  value: natureVolume,
                  onChanged: onVolumeChanged,
                  activeColor: accent,
                  label: 'Nature ${(natureVolume * 100).round()}%',
                ),
              ),
              Icon(Icons.volume_up_rounded, color: accent, size: 20),
            ],
          ),
          Text(
            'Nature volume ${(natureVolume * 100).round()}%',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          for (final _NatureClip clip in _natureClips) ...<Widget>[
            SwitchListTile.adaptive(
              value: enabledIds[clip.id] ?? false,
              onChanged: (bool value) => onChanged(clip.id, value),
              activeThumbColor: accent,
              activeTrackColor: accent.withValues(alpha: 0.35),
              contentPadding: const EdgeInsets.only(left: 4, right: 4),
              secondary: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(clip.icon, color: accent, size: 21),
              ),
              title: Text(
                clip.label,
                style: Theme.of(context).textTheme.bodyLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                activeIds.contains(clip.id)
                    ? 'Playing continuously over green noise'
                    : 'Layer this sound over green noise',
              ),
            ),
          ],
        ],
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
