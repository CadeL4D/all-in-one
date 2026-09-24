import 'dart:math';
import 'dart:typed_data';

import 'package:all_in_one/src/apps/noises/noise_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final NoiseColor color in NoiseColor.values) {
    test('${color.label} stays audible across the loop boundary', () {
      final Uint8List wav = NoiseEngine.generateWav(color);
      final ByteData data = ByteData.sublistView(wav);
      final int count = (wav.length - 44) ~/ 2;
      expect(data.getUint32(24, Endian.little), NoiseEngine.sampleRate);
      expect(count, NoiseEngine.sampleRate * NoiseEngine.durationSeconds);

      double rms(int start, int length) {
        double energy = 0;
        for (int i = start; i < start + length; i++) {
          final int sample = data.getInt16(44 + i * 2, Endian.little);
          energy += sample * sample;
        }
        return sqrt(energy / length);
      }

      final double body = rms(NoiseEngine.sampleRate, NoiseEngine.sampleRate);
      final int edge = NoiseEngine.sampleRate ~/ 20;
      // The old 400 ms fade made these 50 ms edges nearly silent.
      expect(rms(0, edge) / body, inInclusiveRange(0.45, 1.8));
      expect(rms(count - edge, edge) / body, inInclusiveRange(0.45, 1.8));
      for (int start = 0; start + edge <= count; start += edge) {
        expect(rms(start, edge), greaterThan(100));
      }
    });
  }

  test('successive pink textures are different', () {
    expect(
      NoiseEngine.generateWav(NoiseColor.pink),
      isNot(orderedEquals(NoiseEngine.generateWav(NoiseColor.pink))),
    );
  });
}
