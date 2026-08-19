import 'dart:io' show Platform;
import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

import '../../core/local_store.dart';

/// Code-synthesized sound effects: no audio assets, no new dependencies.
/// Every entry point fails silent so tests and platforms without audio
/// never see an error surface. Mobile-only by design; the test runner is
/// detected via FLUTTER_TEST so no platform channels are ever touched in
/// widget tests.
class SanctuarySfx {
  SanctuarySfx._();

  static final SanctuarySfx instance = SanctuarySfx._();

  static const int _sampleRate = 22050;
  static const int _minGapMicros = 55000;
  static final bool _inTestRunner =
      Platform.environment['FLUTTER_TEST'] == 'flutter_test';

  final Map<String, Uint8List> _cache = <String, Uint8List>{};
  final List<AudioPlayer> _players = <AudioPlayer>[];
  final Random _noise = Random(7);
  int _playerCursor = 0;
  int _lastPlayMicros = 0;
  bool _loaded = false;
  bool muted = false;

  Future<void> load() async {
    if (_loaded) {
      return;
    }
    _loaded = true;
    try {
      final Map<String, dynamic>? saved = await LocalStore.readJsonMap(
        LocalStore.sanctuarySoundKey,
      );
      muted = saved?['muted'] == true;
    } catch (_) {
      // Sound preference is optional; default to audible.
    }
  }

  Future<void> setMuted(bool value) async {
    muted = value;
    try {
      await LocalStore.writeJsonMap(LocalStore.sanctuarySoundKey, <String, dynamic>{
        'muted': value,
      });
    } catch (_) {
      // Preference persistence is best-effort.
    }
  }

  void play(String name) {
    if (muted || _inTestRunner) {
      return;
    }
    try {
      final int now = DateTime.now().microsecondsSinceEpoch;
      if (now - _lastPlayMicros < _minGapMicros) {
        return;
      }
      _lastPlayMicros = now;
      _play(name);
    } catch (_) {
      // Audio must never break the game loop.
    }
  }

  Future<void> _play(String name) async {
    try {
      final Uint8List? cached = _cache[name];
      final Uint8List bytes = cached ?? _synthesize(name);
      if (cached == null) {
        _cache[name] = bytes;
      }
      final List<AudioPlayer> pool = _pool;
      final AudioPlayer player = pool[_playerCursor % pool.length];
      _playerCursor++;
      await player.play(BytesSource(bytes));
    } catch (_) {
      // Missing platform channels or busy players are ignorable.
    }
  }

  List<AudioPlayer> get _pool {
    if (_players.isEmpty) {
      for (int index = 0; index < 3; index++) {
        _players.add(AudioPlayer(playerId: 'sanctuary_sfx_$index'));
      }
    }
    return _players;
  }

  Uint8List _synthesize(String name) {
    final List<double> samples = switch (name) {
      'shot' => _click(0.030, 900, 0.24),
      'tap' => _click(0.024, 1250, 0.16),
      'pop' => _sweep(0.075, 620, 170, 0.30),
      'thud' => _thud(),
      'boom' => _boom(),
      'chime' => _chime(),
      'alarm' => _alarm(),
      'horn' => _horn(),
      _ => _click(0.030, 900, 0.2),
    };
    return _wav(samples);
  }

  List<double> _click(double seconds, double freq, double volume) {
    final int count = (seconds * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      final double env = exp(-t * 240);
      final double tone = sin(2 * pi * freq * t);
      final double grit = (_noise.nextDouble() * 2 - 1) * 0.35;
      out[i] = (tone * 0.75 + grit) * env * volume;
    }
    return out;
  }

  List<double> _sweep(double seconds, double start, double end, double volume) {
    final int count = (seconds * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    double phase = 0;
    for (int i = 0; i < count; i++) {
      final double t = i / count;
      final double freq = start + (end - start) * t;
      phase += 2 * pi * freq / _sampleRate;
      final double env = exp(-t * 6.5) * min(1, i / 40.0 + 0.2);
      out[i] = sin(phase) * env * volume;
    }
    return out;
  }

  List<double> _thud() {
    final int count = (0.16 * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    double smoothed = 0;
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      smoothed = smoothed * 0.82 + (_noise.nextDouble() * 2 - 1) * 0.18;
      final double env = exp(-t * 22);
      out[i] = (sin(2 * pi * 88 * t) * 0.7 + smoothed) * env * 0.34;
    }
    return out;
  }

  List<double> _boom() {
    final int count = (0.42 * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    double smoothed = 0;
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      smoothed = smoothed * 0.9 + (_noise.nextDouble() * 2 - 1) * 0.1;
      final double env = exp(-t * 7.5);
      final double sub = sin(2 * pi * (64 - t * 24) * t);
      out[i] = (smoothed * 1.4 + sub * 0.6) * env * 0.38;
    }
    return out;
  }

  List<double> _chime() {
    final int count = (0.55 * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      final double env = exp(-t * 5.2) * min(1, i / 120.0 + 0.15);
      final double a = sin(2 * pi * 659 * t) * 0.6;
      final double b = sin(2 * pi * 988 * t) * 0.4;
      final double shimmer = sin(2 * pi * 1319 * t) * 0.18 * exp(-t * 9);
      out[i] = (a + b + shimmer) * env * 0.26;
    }
    return out;
  }

  List<double> _alarm() {
    final int count = (0.26 * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      final double freq = (t * 1000).floor() % 120 < 60 ? 440 : 554;
      final double square = sin(2 * pi * freq * t) >= 0 ? 1 : -1;
      final double env = min(1, i / 90.0 + 0.2) * (1 - t / 0.26 * 0.4);
      out[i] = square * 0.16 * env;
    }
    return out;
  }

  List<double> _horn() {
    final int count = (0.36 * _sampleRate).round();
    final List<double> out = List<double>.filled(count, 0);
    for (int i = 0; i < count; i++) {
      final double t = i / _sampleRate;
      final double swell = min(1, t / 0.09) * exp(-max(0, t - 0.2) * 9);
      final double a = sin(2 * pi * 220 * t) * 0.6;
      final double b = sin(2 * pi * 277 * t) * 0.35;
      final double c = sin(2 * pi * 330 * t) * 0.25;
      out[i] = (a + b + c) * swell * 0.28;
    }
    return out;
  }

  Uint8List _wav(List<double> samples) {
    final int dataSize = samples.length * 2;
    final ByteData data = ByteData(44 + dataSize);
    void ascii(int offset, String value) {
      for (int i = 0; i < value.length; i++) {
        data.setUint8(offset + i, value.codeUnitAt(i));
      }
    }

    ascii(0, 'RIFF');
    data.setUint32(4, 36 + dataSize, Endian.little);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    data.setUint32(16, 16, Endian.little);
    data.setUint16(20, 1, Endian.little); // PCM
    data.setUint16(22, 1, Endian.little); // mono
    data.setUint32(24, _sampleRate, Endian.little);
    data.setUint32(28, _sampleRate * 2, Endian.little);
    data.setUint16(32, 2, Endian.little);
    data.setUint16(34, 16, Endian.little);
    ascii(36, 'data');
    data.setUint32(40, dataSize, Endian.little);
    for (int i = 0; i < samples.length; i++) {
      final double clamped = samples[i].clamp(-1, 1);
      data.setInt16(44 + i * 2, (clamped * 32767).round(), Endian.little);
    }
    return data.buffer.asUint8List();
  }
}
