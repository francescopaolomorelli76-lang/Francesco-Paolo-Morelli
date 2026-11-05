import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:manga_vox/services/pitch.dart';

/// WAV 16 bit 48 kHz mono con una "voce" sintetica (fondamentale + armoniche,
/// intonazione che oscilla, pause e rumore), come la registra l'iPhone.
Uint8List syntheticVoice(double f0, {int seconds = 2, int rate = 48000}) {
  final rnd = math.Random(1);
  final n = rate * seconds;
  final data = ByteData(44 + n * 2);
  void str(int o, String s) {
    for (var i = 0; i < s.length; i++) {
      data.setUint8(o + i, s.codeUnitAt(i));
    }
  }

  str(0, 'RIFF');
  data.setUint32(4, 36 + n * 2, Endian.little);
  str(8, 'WAVE');
  str(12, 'fmt ');
  data.setUint32(16, 16, Endian.little);
  data.setUint16(20, 1, Endian.little);
  data.setUint16(22, 1, Endian.little);
  data.setUint32(24, rate, Endian.little);
  data.setUint32(28, rate * 2, Endian.little);
  data.setUint16(32, 2, Endian.little);
  data.setUint16(34, 16, Endian.little);
  str(36, 'data');
  data.setUint32(40, n * 2, Endian.little);
  var phase = 0.0;
  for (var i = 0; i < n; i++) {
    final t = i / rate;
    final f = f0 * (1 + 0.06 * math.sin(2 * math.pi * 1.5 * t)); // intonazione
    phase += 2 * math.pi * f / rate;
    final voiced = (t % 0.8) < 0.6; // sillabe e pause
    var s = 0.0;
    if (voiced) {
      for (var h = 1; h <= 6; h++) {
        s += math.sin(h * phase) / h;
      }
      s *= 0.35;
    }
    s += (rnd.nextDouble() - 0.5) * 0.02; // rumore di fondo
    data.setInt16(44 + i * 2, (s.clamp(-1.0, 1.0) * 32000).round(), Endian.little);
  }
  return data.buffer.asUint8List();
}

void main() {
  test('voce maschile (~110 Hz)', () {
    final f0 = medianPitchFromWav(syntheticVoice(110))!;
    expect(f0, closeTo(110, 15));
    expect(f0 < 165, isTrue);
  });

  test('voce femminile (~220 Hz)', () {
    final f0 = medianPitchFromWav(syntheticVoice(220))!;
    expect(f0, closeTo(220, 25));
    expect(f0 > 165, isTrue);
  });

  test('solo rumore: nessuna decisione', () {
    final silent = syntheticVoice(150);
    // Azzera la parte audio lasciando solo l'intestazione e silenzio.
    for (var i = 44; i < silent.length; i++) {
      silent[i] = 0;
    }
    expect(medianPitchFromWav(silent), isNull);
  });

  test('file non WAV ignorato', () {
    expect(medianPitchFromWav(Uint8List.fromList(List.filled(100, 7))), isNull);
  });
}
