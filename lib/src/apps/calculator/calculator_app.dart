import 'package:flutter/material.dart';

import '../../screens/app_scaffold.dart';

class CalculatorApp extends StatefulWidget {
  const CalculatorApp({super.key});

  @override
  State<CalculatorApp> createState() => _CalculatorAppState();
}

class _CalculatorAppState extends State<CalculatorApp> {
  double _current = 0;
  double _accumulator = 0;
  String? _pendingOperator;
  bool _replaceDisplay = true;

  String get _display {
    if (_current.isNaN || _current.isInfinite) {
      return 'Error';
    }

    final double rounded = double.parse(_current.toStringAsFixed(10));
    if (rounded == rounded.roundToDouble() && rounded.abs() < 1e15) {
      return rounded.toInt().toString();
    }
    return rounded
        .toStringAsFixed(8)
        .replaceFirst(RegExp(r'0+$'), '')
        .replaceFirst(RegExp(r'\.$'), '');
  }

  void _inputDigit(int digit) {
    setState(() {
      if (_replaceDisplay) {
        _current = digit.toDouble();
        _replaceDisplay = false;
      } else {
        final String next = _display + digit.toString();
        final double? parsed = double.tryParse(next);
        if (parsed != null) {
          _current = parsed;
        }
      }
    });
  }

  void _inputDecimal() {
    setState(() {
      if (_replaceDisplay) {
        _current = 0;
        _replaceDisplay = false;
      }
      if (!_display.contains('.')) {
        final double? parsed = double.tryParse('$_display.');
        if (parsed != null) {
          _current = parsed;
        }
      }
    });
  }

  void _chooseOperator(String operator) {
    setState(() {
      if (_pendingOperator != null && !_replaceDisplay) {
        _current = _calculate(_accumulator, _current, _pendingOperator!);
      }
      _accumulator = _current;
      _pendingOperator = operator;
      _replaceDisplay = true;
    });
  }

  void _equals() {
    if (_pendingOperator == null) {
      return;
    }
    setState(() {
      _current = _calculate(_accumulator, _current, _pendingOperator!);
      _accumulator = _current;
      _pendingOperator = null;
      _replaceDisplay = true;
    });
  }

  double _calculate(double left, double right, String operator) {
    switch (operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '×':
        return left * right;
      case '÷':
        return right == 0 ? double.nan : left / right;
      default:
        return right;
    }
  }

  void _clear() {
    setState(() {
      _current = 0;
      _accumulator = 0;
      _pendingOperator = null;
      _replaceDisplay = true;
    });
  }

  void _toggleSign() {
    setState(() => _current = -_current);
  }

  void _percent() {
    setState(() => _current = _current / 100);
  }

  void _onTap(String value) {
    switch (value) {
      case 'AC':
        _clear();
      case '+/-':
        _toggleSign();
      case '%':
        _percent();
      case '÷':
      case '×':
      case '-':
      case '+':
        _chooseOperator(value);
      case '=':
        _equals();
      case '.':
        _inputDecimal();
      default:
        _inputDigit(int.parse(value));
    }
  }

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return AppScaffold(
      title: 'Calculator',
      icon: Icons.calculate_rounded,
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          children: <Widget>[
            Expanded(
              child: Align(
                alignment: Alignment.bottomRight,
                child: Padding(
                  padding: const EdgeInsets.only(right: 8, bottom: 12),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      _display,
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 64,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -2,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            _CalculatorGrid(onTap: _onTap, accent: scheme.primary),
          ],
        ),
      ),
    );
  }
}

class _CalculatorGrid extends StatelessWidget {
  const _CalculatorGrid({required this.onTap, required this.accent});

  final ValueChanged<String> onTap;
  final Color accent;

  static const List<List<String>> _rows = <List<String>>[
    <String>['AC', '+/-', '%', '÷'],
    <String>['7', '8', '9', '×'],
    <String>['4', '5', '6', '-'],
    <String>['1', '2', '3', '+'],
    <String>['0', '.', '='],
  ];

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return Column(
      children: <Widget>[
        for (final List<String> row in _rows) ...<Widget>[
          Row(
            children: <Widget>[
              for (final String label in row) ...<Widget>[
                Expanded(
                  flex: label == '0' ? 2 : 1,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: _CalcButton(
                      label: label,
                      onTap: () => onTap(label),
                      foreground: _isOperator(label)
                          ? scheme.primary
                          : scheme.onSurface,
                      background: _isOperator(label)
                          ? scheme.primaryContainer
                          : scheme.surfaceContainerHighest,
                      isAccent: label == '=',
                      accent: accent,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (row.length == 3) const SizedBox(height: 2),
        ],
      ],
    );
  }

  bool _isOperator(String label) {
    return label == '÷' ||
        label == '×' ||
        label == '-' ||
        label == '+' ||
        label == '=';
  }
}

class _CalcButton extends StatelessWidget {
  const _CalcButton({
    required this.label,
    required this.onTap,
    required this.foreground,
    required this.background,
    required this.isAccent,
    required this.accent,
  });

  final String label;
  final VoidCallback onTap;
  final Color foreground;
  final Color background;
  final bool isAccent;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isAccent ? accent : background,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: SizedBox(
          height: 64,
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isAccent ? Colors.white : foreground,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
