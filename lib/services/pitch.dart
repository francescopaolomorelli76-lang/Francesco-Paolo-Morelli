import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

/// Genere della voce di chi parla, stimato dal tono (frequenza fondamentale).
enum VoiceGender { male, female }

/// Stima il genere della voce in un file WAV PCM 16 bit.
/// Tono medio (mediana) sotto ~165 Hz → uomo, sopra → donna.
/// Restituisce null se non c'è abbastanza voce per decidere.
Future<VoiceGender?> genderFromWav(String path) async {
  try {
    final bytes = await File(path).readAsBytes();
    final f0 = await compute(medianPitchFromWav, bytes);
    if (f0 == null) return null;
    return f0 < 165 ? VoiceGender.male : VoiceGender.female;
  } catch (_) {
    return null;
  }
}

/// Mediana della frequenza fondamentale (Hz) dei tratti con voce, o null.
double? medianPitchFromWav(Uint8List wav) {
  final pcm = readWav16(wav);
  if (pcm == null) return null;
  final (samples, rate) = pcm;

  // Ricampiona a ~8 kHz (media di blocchi): basta per toni 70–350 Hz ed è veloce.
  final step = math.max(1, (rate / 8000).round());
  final sr = rate / step;
  final n = samples.length ~/ step;
  final x = Float64List(n);
  for (var i = 0; i < n; i++) {
    var s = 0.0;
    for (var j = 0; j < step; j++) {
      s += samples[i * step + j];
    }
    x[i] = s / step;
  }

  final frame = (sr * 0.04).round(); // 40 ms
  final hop = frame ~/ 2;
  final minLag = (sr / 350).floor();
  final maxLag = (sr / 70).ceil();
  if (n < frame + maxLag) return null;

  // Soglia di energia: solo i tratti in cui si parla davvero.
  var maxEnergy = 0.0;
  final energies = <double>[];
  for (var start = 0; start + frame + maxLag < n; start += hop) {
    var e = 0.0;
    for (var i = 0; i < frame; i++) {
      e += x[start + i] * x[start + i];
    }
    energies.add(e);
    if (e > maxEnergy) maxEnergy = e;
  }
  if (maxEnergy <= 0) return null;

  final pitches = <double>[];
  var k = 0;
  for (var start = 0; start + frame + maxLag < n; start += hop, k++) {
    if (energies[k] < maxEnergy * 0.08) continue;
    var bestLag = 0;
    var best = 0.0;
    for (var lag = minLag; lag <= maxLag; lag++) {
      var num = 0.0, e1 = 0.0, e2 = 0.0;
      for (var i = 0; i < frame; i++) {
        final a = x[start + i], b = x[start + i + lag];
        num += a * b;
        e1 += a * a;
        e2 += b * b;
      }
      final r = num / math.sqrt(e1 * e2 + 1e-12);
      if (r > best) {
        best = r;
        bestLag = lag;
      }
    }
    if (best > 0.6 && bestLag > 0) pitches.add(sr / bestLag);
  }
  if (pitches.length < 3) return null;
  pitches.sort();
  return pitches[pitches.length ~/ 2];
}

/// Legge un WAV PCM 16 bit: campioni del primo canale in -1..1 e frequenza.
(Float64List, int)? readWav16(Uint8List b) {
  if (b.length < 44) return null;
  final d = ByteData.sublistView(b);
  String tag(int o) => String.fromCharCodes(b.sublist(o, o + 4));
  if (tag(0) != 'RIFF' || tag(8) != 'WAVE') return null;
  var off = 12;
  int? channels, rate, bits;
  while (off + 8 <= b.length) {
    final id = tag(off);
    final size = d.getUint32(off + 4, Endian.little);
    final body = off + 8;
    if (id == 'fmt ') {
      channels = d.getUint16(body + 2, Endian.little);
      rate = d.getUint32(body + 4, Endian.little);
      bits = d.getUint16(body + 14, Endian.little);
    } else if (id == 'data' && channels != null && rate != null && bits == 16) {
      final end = math.min(b.length, body + size);
      final frames = (end - body) ~/ (2 * channels);
      final out = Float64List(frames);
      for (var i = 0; i < frames; i++) {
        out[i] = d.getInt16(body + i * 2 * channels, Endian.little) / 32768.0;
      }
      return (out, rate);
    }
    off = body + size + (size.isOdd ? 1 : 0);
  }
  return null;
}

/// WAV 16 kHz mono 16 bit (il formato di Whisper) da un WAV PCM 16 bit
/// qualsiasi, ricampionato sul telefono in pochi millisecondi (senza ffmpeg).
Uint8List? toWhisperWav(Uint8List wav) {
  final pcm = readWav16(wav);
  if (pcm == null) return null;
  final (x, rate) = pcm;
  if (rate <= 0 || x.isEmpty) return null;
  final ratio = rate / 16000;
  final n = (x.length / ratio).floor();
  final out = ByteData(44 + n * 2);
  void tag(int o, String t) {
    for (var i = 0; i < 4; i++) {
      out.setUint8(o + i, t.codeUnitAt(i));
    }
  }

  tag(0, 'RIFF');
  out.setUint32(4, 36 + n * 2, Endian.little);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  out.setUint32(16, 16, Endian.little);
  out.setUint16(20, 1, Endian.little);
  out.setUint16(22, 1, Endian.little);
  out.setUint32(24, 16000, Endian.little);
  out.setUint32(28, 32000, Endian.little);
  out.setUint16(32, 2, Endian.little);
  out.setUint16(34, 16, Endian.little);
  tag(36, 'data');
  out.setUint32(40, n * 2, Endian.little);
  // Media dei campioni che cadono in ogni campione d'uscita (filtro passa-basso
  // semplice, basta per la voce).
  final half = math.max(0, (ratio / 2).floor());
  for (var i = 0; i < n; i++) {
    final c = (i * ratio).round();
    final a = math.max(0, c - half), b = math.min(x.length - 1, c + half);
    var s = 0.0;
    for (var j = a; j <= b; j++) {
      s += x[j];
    }
    final v = (s / (b - a + 1) * 32767).round().clamp(-32768, 32767);
    out.setInt16(44 + i * 2, v, Endian.little);
  }
  return out.buffer.asUint8List();
}

/// Scrive accanto a [path] la copia per Whisper (stesso nome + ".wav") e ne
/// restituisce il percorso; null se il file non è un WAV leggibile.
Future<String?> whisperWavFile(String path) async {
  try {
    final bytes = await File(path).readAsBytes();
    final out = await compute(toWhisperWav, bytes);
    if (out == null) return null;
    final dest = '$path.wav';
    await File(dest).writeAsBytes(out, flush: true);
    return dest;
  } catch (_) {
    return null;
  }
}
