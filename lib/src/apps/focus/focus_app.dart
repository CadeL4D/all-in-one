import 'dart:async';

import 'package:flutter/material.dart';

import '../../screens/app_scaffold.dart';

enum _FocusMode { focus, shortBreak }

class FocusApp extends StatefulWidget {
  const FocusApp({super.key});

  @override
  State<FocusApp> createState() => _FocusAppState();
}

class _FocusAppState extends State<FocusApp> {
  static const int _focusSeconds = 25 * 60;
  static const int _breakSeconds = 5 * 60;

  Timer? _timer;
  _FocusMode _mode = _FocusMode.focus;
  int _remainingSeconds = _focusSeconds;
  int _sessionCount = 0;
  bool _isRunning = false;

  int get _totalSeconds =>
      _mode == _FocusMode.focus ? _focusSeconds : _breakSeconds;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startPause() {
    if (_isRunning) {
      _timer?.cancel();
      setState(() => _isRunning = false);
      return;
    }

    setState(() => _isRunning = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      setState(() {
        if (_remainingSeconds > 1) {
          _remainingSeconds--;
          return;
        }

        timer.cancel();
        _isRunning = false;
        if (_mode == _FocusMode.focus) {
          _sessionCount++;
        }
        _switchMode(
          _mode == _FocusMode.focus ? _FocusMode.shortBreak : _FocusMode.focus,
        );
      });
    });
  }

  void _reset() {
    _timer?.cancel();
    setState(() {
      _isRunning = false;
      _remainingSeconds = _totalSeconds;
    });
  }

  void _switchMode(_FocusMode mode) {
    _timer?.cancel();
    setState(() {
      _mode = mode;
      _isRunning = false;
      _remainingSeconds = mode == _FocusMode.focus
          ? _focusSeconds
          : _breakSeconds;
    });
  }

  String get _timeLabel {
    final int minutes = _remainingSeconds ~/ 60;
    final int seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final double progress = 1 - (_remainingSeconds / _totalSeconds);

    return AppScaffold(
      title: 'Focus',
      icon: Icons.timer_rounded,
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
        child: Column(
          children: <Widget>[
            const SizedBox(height: 8),
            _ModeSwitch(mode: _mode, onModeChanged: _switchMode),
            const SizedBox(height: 28),
            Expanded(
              child: Center(
                child: SizedBox(
                  width: 250,
                  height: 250,
                  child: Stack(
                    fit: StackFit.expand,
                    children: <Widget>[
                      CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 14,
                        backgroundColor: scheme.surfaceContainerHighest,
                        color: _mode == _FocusMode.focus
                            ? const Color(0xFFFC466B)
                            : const Color(0xFF3F5EFB),
                      ),
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Text(
                              _timeLabel,
                              style: TextStyle(
                                fontSize: 48,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1.5,
                                color: scheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isRunning
                                  ? 'Stay with it'
                                  : 'Ready when you are',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              _sessionCount == 1
                  ? '1 session completed'
                  : '$_sessionCount sessions completed',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _startPause,
                icon: Icon(
                  _isRunning ? Icons.pause_rounded : Icons.play_arrow_rounded,
                ),
                label: Text(_isRunning ? 'Pause' : 'Start'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _reset,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reset'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeSwitch extends StatelessWidget {
  const _ModeSwitch({required this.mode, required this.onModeChanged});

  final _FocusMode mode;
  final ValueChanged<_FocusMode> onModeChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: _ModeButton(
              label: 'Focus',
              selected: mode == _FocusMode.focus,
              color: const Color(0xFFFC466B),
              onTap: () => onModeChanged(_FocusMode.focus),
            ),
          ),
          Expanded(
            child: _ModeButton(
              label: 'Short break',
              selected: mode == _FocusMode.shortBreak,
              color: const Color(0xFF3F5EFB),
              onTap: () => onModeChanged(_FocusMode.shortBreak),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color : Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 11),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected
                  ? Colors.white
                  : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
