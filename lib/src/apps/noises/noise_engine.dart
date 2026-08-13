import 'dart:math';
import 'dart:typed_data';

enum NoiseColor { white, pink, brown, blue, violet, grey, green }

extension NoiseColorLabel on NoiseColor {
  String get label {
    switch (this) {
      case NoiseColor.white:
        return 'White';
      case NoiseColor.pink:
        return 'Pink';
      case NoiseColor.brown:
        return 'Brown';
      case NoiseColor.blue:
        return 'Blue';
      case NoiseColor.violet:
        return 'Violet';
      case NoiseColor.grey:
        return 'Grey';
      case NoiseColor.green:
        return 'Green';
    }
  }

  String get description {
    switch (this) {
      case NoiseColor.white:
        return 'Even energy across the spectrum.';
      case NoiseColor.pink:
        return 'Warmer, with less high-frequency energy.';
      case NoiseColor.brown:
        return 'Deep, rumbling low-frequency noise.';
      case NoiseColor.blue:
        return 'Bright, hissy high-frequency noise.';
      case NoiseColor.violet:
        return 'Even brighter and airier than blue.';
      case NoiseColor.grey:
        return 'Psychoacoustically balanced loudness.';
      case NoiseColor.green:
        return 'Mid-focused, like steady natural ambience.';
    }
  }
}

abstract final class NoiseEngine {
  static const int sampleRate = 22050;
  static const double durationSeconds = 16;
  static const double fadeSeconds = 0.4;

  static Uint8List generateWav(NoiseColor color, {double volume = 0.82}) {
    final Int16List samples = _generateSamples(color, volume);
    return _encodeWav(samples);
  }

  static Int16List _generateSamples(NoiseColor color, double volume) {
    final int sampleCount = (sampleRate * durationSeconds).round();
    final int fadeSamples = (sampleRate * fadeSeconds).round();
    final Float64List raw = Float64List(sampleCount);
    final Random random = Random();

    switch (color) {
      case NoiseColor.white:
        for (int i = 0; i < sampleCount; i++) {
          raw[i] = _nextWhite(random);
        }
      case NoiseColor.pink:
        _fillPink(raw, random);
      case NoiseColor.brown:
        _fillBrown(raw, random);
      case NoiseColor.blue:
        _fillBlue(raw, random);
      case NoiseColor.violet:
        _fillViolet(raw, random);
      case NoiseColor.grey:
        _fillGrey(raw, random);
      case NoiseColor.green:
        _fillGreen(raw, random);
    }

    double maxSample = 0;
    for (int i = 0; i < sampleCount; i++) {
      final double value = raw[i].abs();
      if (value > maxSample) {
        maxSample = value;
      }
    }

    final double peak = maxSample == 0 ? 1 : maxSample;
    final double scale = (volume * 0.92) / peak;
    final Int16List samples = Int16List(sampleCount);

    for (int i = 0; i < sampleCount; i++) {
      double value = raw[i] * scale;

      final double fadeIn = fadeSamples == 0 ? 1 : min(1, i / fadeSamples);
      final double fadeOut = fadeSamples == 0
          ? 1
          : min(1, (sampleCount - 1 - i) / fadeSamples);
      value *= min(fadeIn, fadeOut);

      samples[i] = (value.clamp(-1.0, 1.0) * 32767).round();
    }

    return samples;
  }

  static double _nextWhite(Random random) => random.nextDouble() * 2 - 1;

  static void _fillPink(Float64List output, Random random) {
    double b0 = 0;
    double b1 = 0;
    double b2 = 0;
    double b3 = 0;
    double b4 = 0;
    double b5 = 0;
    double b6 = 0;

    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      final double pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      output[i] = pink * 0.11;
    }
  }

  static void _fillBrown(Float64List output, Random random) {
    double last = 0;
    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      last = (last + 0.02 * white) / 1.02;
      output[i] = last * 3.5;
    }
  }

  static void _fillBlue(Float64List output, Random random) {
    double previous = 0;
    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      output[i] = white - previous;
      previous = white;
    }
  }

  static void _fillViolet(Float64List output, Random random) {
    double previous = 0;
    double previousDifference = 0;
    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      final double difference = white - previous;
      output[i] = difference - previousDifference;
      previousDifference = difference;
      previous = white;
    }
  }

  static void _fillGrey(Float64List output, Random random) {
    double low = 0;
    double high = 0;
    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      low = low + 0.012 * (white - low);
      high = white - high * 0.25;
      output[i] = low * 2.1 + high * 0.55;
    }
  }

  static void _fillGreen(Float64List output, Random random) {
    double lowPass = 0;
    double highPass = 0;
    double previousWhite = 0;
    for (int i = 0; i < output.length; i++) {
      final double white = _nextWhite(random);
      lowPass = lowPass + 0.085 * (white - lowPass);
      highPass = 0.72 * (highPass + lowPass - previousWhite);
      previousWhite = lowPass;
      output[i] = highPass * 2.7;
    }
  }

  static Uint8List _encodeWav(Int16List samples) {
    final int dataLength = samples.length * 2;
    final ByteData data = ByteData(44 + dataLength);
    int offset = 0;

    void writeAscii(String value) {
      for (final int code in value.codeUnits) {
        data.setUint8(offset++, code);
      }
    }

    writeAscii('RIFF');
    data.setUint32(offset, 36 + dataLength, Endian.little);
    offset += 4;
    writeAscii('WAVE');
    writeAscii('fmt ');
    data.setUint32(offset, 16, Endian.little);
    offset += 4;
    data.setUint16(offset, 1, Endian.little);
    offset += 2;
    data.setUint16(offset, 1, Endian.little);
    offset += 2;
    data.setUint32(offset, sampleRate, Endian.little);
    offset += 4;
    data.setUint32(offset, sampleRate * 2, Endian.little);
    offset += 4;
    data.setUint16(offset, 2, Endian.little);
    offset += 2;
    data.setUint16(offset, 16, Endian.little);
    offset += 2;
    writeAscii('data');
    data.setUint32(offset, dataLength, Endian.little);
    offset += 4;

    for (int i = 0; i < samples.length; i++) {
      data.setInt16(offset, samples[i], Endian.little);
      offset += 2;
    }

    return data.buffer.asUint8List();
  }
}
