import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('generate the launcher icon from its vector geometry', () async {
    const double size = 1024;
    const ui.Offset center = ui.Offset(size / 2, size / 2);
    const double gap = 0.86;

    final ui.PictureRecorder recorder = ui.PictureRecorder();
    final ui.Canvas canvas = ui.Canvas(recorder);
    canvas.drawRect(
      const ui.Rect.fromLTWH(0, 0, size, size),
      ui.Paint()..color = const ui.Color(0xFF071533),
    );
    canvas.drawArc(
      ui.Rect.fromCircle(center: center, radius: 316),
      -math.pi / 2 + gap / 2,
      2 * math.pi - gap,
      false,
      ui.Paint()
        ..color = const ui.Color(0xFFF7F3E8)
        ..style = ui.PaintingStyle.stroke
        ..strokeWidth = 104
        ..strokeCap = ui.StrokeCap.round
        ..isAntiAlias = true,
    );
    canvas.drawCircle(
      center,
      82,
      ui.Paint()
        ..color = const ui.Color(0xFF7C5CFF)
        ..isAntiAlias = true,
    );

    final ui.Image icon = await recorder.endRecording().toImage(
      size.toInt(),
      size.toInt(),
    );
    final ByteData bytes = (await icon.toByteData(
      format: ui.ImageByteFormat.png,
    ))!;
    await File('assets/branding/one_hub_icon.png')
        .writeAsBytes(bytes.buffer.asUint8List());
  });
}
