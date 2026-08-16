import 'dart:math';

import 'package:flutter/material.dart';

class ResolveRank {
  const ResolveRank({
    required this.name,
    required this.floor,
    required this.ceiling,
    required this.colors,
    required this.tier,
  });

  final String name;
  final int floor;
  final int? ceiling;
  final List<Color> colors;
  final int tier;

  double progress(int rating) {
    final int? top = ceiling;
    if (top == null) {
      return 1;
    }
    return ((rating - floor) / (top - floor)).clamp(0, 1);
  }

  int? get nextAt => ceiling;
}

ResolveRank resolveRankFor(int rating) {
  if (rating < 1100) {
    return const ResolveRank(
      name: 'Kindled',
      floor: 800,
      ceiling: 1100,
      colors: <Color>[Color(0xFFF59E0B), Color(0xFFF97316)],
      tier: 0,
    );
  }
  if (rating < 1225) {
    return const ResolveRank(
      name: 'Cadence',
      floor: 1100,
      ceiling: 1225,
      colors: <Color>[Color(0xFF14B8A6), Color(0xFF22D3EE)],
      tier: 1,
    );
  }
  if (rating < 1350) {
    return const ResolveRank(
      name: 'Tempered',
      floor: 1225,
      ceiling: 1350,
      colors: <Color>[Color(0xFF64748B), Color(0xFFE2E8F0)],
      tier: 2,
    );
  }
  if (rating < 1475) {
    return const ResolveRank(
      name: 'Kinetic',
      floor: 1350,
      ceiling: 1475,
      colors: <Color>[Color(0xFF2563EB), Color(0xFF8B5CF6)],
      tier: 3,
    );
  }
  if (rating < 1625) {
    return const ResolveRank(
      name: 'Loadstar',
      floor: 1475,
      ceiling: 1625,
      colors: <Color>[Color(0xFFEC4899), Color(0xFFFBBF24)],
      tier: 4,
    );
  }
  return const ResolveRank(
    name: 'Everform',
    floor: 1625,
    ceiling: null,
    colors: <Color>[Color(0xFF7C3AED), Color(0xFF4DE1A8)],
    tier: 5,
  );
}

class ResolveBadge extends StatelessWidget {
  const ResolveBadge({
    super.key,
    required this.rating,
    this.size = 92,
    this.showLabel = true,
  });

  final int rating;
  final double size;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final ResolveRank rank = resolveRankFor(rating);
    return Semantics(
      label: '${rank.name} rank, $rating Resolve',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          SizedBox.square(
            dimension: size,
            child: CustomPaint(painter: _ResolveBadgePainter(rank: rank)),
          ),
          if (showLabel) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              rank.name.toUpperCase(),
              style: TextStyle(
                color: rank.colors.first,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ResolveBadgePainter extends CustomPainter {
  const _ResolveBadgePainter({required this.rank});

  final ResolveRank rank;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = size.center(Offset.zero);
    final double radius = size.shortestSide * 0.44;
    final Rect bounds = Rect.fromCircle(center: center, radius: radius);
    final Paint glow = Paint()
      ..color = rank.colors.first.withValues(alpha: 0.22)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, size.width * 0.08);
    canvas.drawCircle(center, radius * 0.96, glow);
    final Paint shell = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: rank.colors,
      ).createShader(bounds);
    final Path hex = _polygon(center, radius, 6, -pi / 2);
    canvas.drawPath(hex, shell);
    canvas.drawPath(
      _polygon(center, radius * 0.78, 6, -pi / 2),
      Paint()..color = const Color(0xFF151821),
    );
    final Paint mark = Paint()
      ..color = rank.colors.last
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.055
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    switch (rank.tier) {
      case 0:
        final Path spark = Path()
          ..moveTo(center.dx + radius * 0.08, center.dy - radius * 0.50)
          ..lineTo(center.dx - radius * 0.28, center.dy + radius * 0.02)
          ..lineTo(center.dx - radius * 0.02, center.dy + radius * 0.02)
          ..lineTo(center.dx - radius * 0.14, center.dy + radius * 0.50)
          ..lineTo(center.dx + radius * 0.34, center.dy - radius * 0.10)
          ..lineTo(center.dx + radius * 0.05, center.dy - radius * 0.10);
        canvas.drawPath(spark, mark);
      case 1:
        for (final double y in <double>[-0.24, 0, 0.24]) {
          canvas.drawArc(
            Rect.fromCenter(
              center: center + Offset(0, radius * y),
              width: radius * 0.95,
              height: radius * 0.42,
            ),
            0,
            pi,
            false,
            mark,
          );
        }
      case 2:
        canvas.drawPath(_polygon(center, radius * 0.43, 6, -pi / 2), mark);
        canvas.drawLine(
          center - Offset(radius * 0.24, 0),
          center + Offset(radius * 0.24, 0),
          mark,
        );
      case 3:
        canvas.drawOval(
          Rect.fromCenter(
            center: center,
            width: radius * 1.05,
            height: radius * 0.52,
          ),
          mark,
        );
        canvas.save();
        canvas.translate(center.dx, center.dy);
        canvas.rotate(pi / 2.7);
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset.zero,
            width: radius * 1.05,
            height: radius * 0.52,
          ),
          mark,
        );
        canvas.restore();
        canvas.drawCircle(
          center,
          radius * 0.09,
          Paint()..color = rank.colors.last,
        );
      case 4:
        final Path star = Path();
        for (int index = 0; index < 8; index++) {
          final double pointRadius = index.isEven
              ? radius * 0.48
              : radius * 0.18;
          final double angle = -pi / 2 + index * pi / 4;
          final Offset point =
              center + Offset(cos(angle), sin(angle)) * pointRadius;
          if (index == 0) {
            star.moveTo(point.dx, point.dy);
          } else {
            star.lineTo(point.dx, point.dy);
          }
        }
        star.close();
        canvas.drawPath(star, mark);
      case 5:
        final Path ribbon = Path()
          ..moveTo(center.dx - radius * 0.45, center.dy)
          ..cubicTo(
            center.dx - radius * 0.2,
            center.dy - radius * 0.5,
            center.dx + radius * 0.2,
            center.dy + radius * 0.5,
            center.dx + radius * 0.45,
            center.dy,
          )
          ..cubicTo(
            center.dx + radius * 0.2,
            center.dy - radius * 0.5,
            center.dx - radius * 0.2,
            center.dy + radius * 0.5,
            center.dx - radius * 0.45,
            center.dy,
          );
        canvas.drawPath(ribbon, mark);
    }
  }

  Path _polygon(Offset center, double radius, int sides, double rotation) {
    final Path path = Path();
    for (int index = 0; index < sides; index++) {
      final double angle = rotation + index * pi * 2 / sides;
      final Offset point = center + Offset(cos(angle), sin(angle)) * radius;
      if (index == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    return path..close();
  }

  @override
  bool shouldRepaint(_ResolveBadgePainter oldDelegate) =>
      oldDelegate.rank.tier != rank.tier;
}
