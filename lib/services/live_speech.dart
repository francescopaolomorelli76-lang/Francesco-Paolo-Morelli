import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../languages.dart';

/// Stato dei permessi: "granted", "denied" o "undetermined".
class MicPermissions {
  MicPermissions(this.mic, this.speech);
  final String mic, speech;
  bool get ok => mic == 'granted' && speech == 'granted';
  bool get denied => mic == 'denied' || speech == 'denied';
}

/// Esito di una pressione del pulsante.
class LiveResult {
  LiveResult({this.text = '', this.audioPath, required this.peakDb, required this.held, this.error});
  final String text;

  /// Audio registrato (per riconoscere la lingua quando non è ancora nota).
  final String? audioPath;
  final double peakDb;
  final Duration held;
  final String? error;

  bool get tooShort => held < const Duration(milliseconds: 400);
  bool get silent => peakDb < -50;
}

/// Microfono e riconoscimento vocale IN TEMPO REALE, sul telefono.
/// - iPhone: motore Apple (canale nativo manga_vox/speech): parole parziali
///   mentre si parla, risultato finale in pochi decimi di secondo dopo il rilascio.
/// - Android: riconoscitore di sistema (speech_to_text).
/// Se la lingua non è nota, registra soltanto l'audio su file: la lingua
/// verrà riconosciuta da Whisper (vedi SpeechService.detect).
class LiveSpeech {
  LiveSpeech._() {
    if (Platform.isIOS) {
      _events.receiveBroadcastStream().listen((e) {
        if (e is! Map) return;
        if (e['type'] == 'partial') partial.value = '${e['text'] ?? ''}';
        if (e['type'] == 'level') _setLevel((e['db'] as num).toDouble());
      }, onError: (_) {});
    }
  }
  static final LiveSpeech instance = LiveSpeech._();

  static const _ch = MethodChannel('manga_vox/speech');
  static const _events = EventChannel('manga_vox/speech_events');

  /// Testo riconosciuto finora (aggiornato mentre si parla).
  final ValueNotifier<String> partial = ValueNotifier('');

  /// Volume del microfono 0..1, per le barre nel pulsante.
  final ValueNotifier<double> level = ValueNotifier(0);

  double _peakDb = -160;
  DateTime _started = DateTime.now();
  String? _path;

  // Android
  final SpeechToText _stt = SpeechToText();
  bool _sttReady = false;
  AudioRecorder? _rec;
  Timer? _meter;
  Completer<String>? _final;

  void _setLevel(double db) {
    if (db > _peakDb) _peakDb = db;
    level.value = ((db + 55) / 45).clamp(0.0, 1.0);
  }

  // ───────────── permessi ─────────────

  Future<MicPermissions> permissions() async {
    if (Platform.isIOS) {
      final m = Map<String, dynamic>.from(await _ch.invokeMethod('permissions') as Map);
      return MicPermissions('${m['mic']}', '${m['speech']}');
    }
    final mic = await (_rec ??= AudioRecorder()).hasPermission(request: false);
    return MicPermissions(mic ? 'granted' : 'undetermined', 'granted');
  }

  /// Chiede i permessi (la prima volta compare la richiesta di sistema).
  Future<MicPermissions> request() async {
    if (Platform.isIOS) {
      final m = Map<String, dynamic>.from(await _ch.invokeMethod('request') as Map);
      return MicPermissions('${m['mic']}', '${m['speech']}');
    }
    final mic = await (_rec ??= AudioRecorder()).hasPermission();
    return MicPermissions(mic ? 'granted' : 'denied', 'granted');
  }

  /// Apre direttamente la pagina dei permessi di Manga Vox (se negati in passato).
  Future<void> openSettings() async {
    if (Platform.isIOS) await _ch.invokeMethod('openSettings');
  }

  // ───────────── registrazione ─────────────

  /// Inizia ad ascoltare. [lang] null = lingua sconosciuta (solo registrazione).
  Future<bool> start(Lang? lang, {bool headsetMic = false}) async {
    partial.value = '';
    level.value = 0;
    _peakDb = -160;
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/mv_${DateTime.now().millisecondsSinceEpoch}.wav';
    if (Platform.isIOS) {
      var p = await permissions();
      if (!p.ok) p = await request();
      if (!p.ok) return false;
      await _ch.invokeMethod('start', {
        'locale': lang?.locale,
        'path': _path,
        'input': headsetMic ? 'headset' : 'builtin',
      });
      _started = DateTime.now();
      return true;
    }
    return lang == null ? _androidStartRecord() : _androidStartStt(lang);
  }

  /// Ferma e restituisce il testo finale (in pochi decimi di secondo).
  Future<LiveResult> stop() async {
    final held = DateTime.now().difference(_started);
    try {
      if (Platform.isIOS) {
        final m = Map<String, dynamic>.from(await _ch.invokeMethod('stop') as Map);
        final peak = (m['peakDb'] as num?)?.toDouble() ?? _peakDb;
        final text = '${m['text'] ?? ''}'.trim();
        return LiveResult(text: text.isEmpty ? partial.value.trim() : text, audioPath: _path, peakDb: peak, held: held);
      }
      return await _androidStop(held);
    } catch (e) {
      return LiveResult(error: '$e', peakDb: _peakDb, held: held, audioPath: _path);
    } finally {
      level.value = 0;
    }
  }

  Future<void> cancel() async {
    try {
      if (Platform.isIOS) {
        await _ch.invokeMethod('cancel');
      } else {
        await _stt.cancel();
        await _rec?.cancel();
      }
    } catch (_) {}
    level.value = 0;
  }

  /// iPhone: trascrive un file già registrato in una lingua nota (preciso, veloce).
  Future<String?> recognizeFile(String path, Lang lang) async {
    if (!Platform.isIOS) return null;
    try {
      return await _ch.invokeMethod<String>('recognizeFile', {'path': path, 'locale': lang.locale});
    } catch (_) {
      return null;
    }
  }

  static Future<void> deleteAudio(String? path) async {
    if (path == null) return;
    for (final f in [File(path), File('$path.wav')]) {
      if (await f.exists()) await f.delete().catchError((_) => f);
    }
  }

  // ───────────── Android ─────────────

  Future<bool> _androidStartRecord() async {
    final rec = _rec ??= AudioRecorder();
    if (!await rec.hasPermission()) return false;
    await rec.start(const RecordConfig(encoder: AudioEncoder.wav, sampleRate: 16000, numChannels: 1), path: _path!);
    _started = DateTime.now();
    _meter?.cancel();
    _meter = Timer.periodic(const Duration(milliseconds: 80), (_) async {
      try {
        final a = await rec.getAmplitude();
        if (a.current.isFinite) _setLevel(a.current);
      } catch (_) {}
    });
    return true;
  }

  Future<bool> _androidStartStt(Lang lang) async {
    if (!_sttReady) {
      _sttReady = await _stt.initialize(
        onError: (SpeechRecognitionError e) {
          if (_final != null && !_final!.isCompleted) _final!.complete(partial.value);
        },
      );
    }
    if (!_sttReady) return false;
    _final = Completer<String>();
    _path = null;
    await _stt.listen(
      onResult: (r) {
        partial.value = r.recognizedWords;
        if (r.finalResult && _final != null && !_final!.isCompleted) _final!.complete(r.recognizedWords);
      },
      onSoundLevelChange: (l) => _setLevel(-50 + l * 4), // circa -2..10 → dB indicativi
      listenOptions: SpeechListenOptions(
        localeId: lang.locale.replaceAll('-', '_'),
        partialResults: true,
        onDevice: false,
        listenMode: ListenMode.dictation,
        listenFor: const Duration(minutes: 1),
        pauseFor: const Duration(seconds: 30),
      ),
    );
    _started = DateTime.now();
    return true;
  }

  Future<LiveResult> _androidStop(Duration held) async {
    if (_rec != null && await _rec!.isRecording()) {
      _meter?.cancel();
      final path = await _rec!.stop();
      return LiveResult(audioPath: path ?? _path, peakDb: _peakDb, held: held);
    }
    await _stt.stop();
    final text = await (_final?.future ?? Future.value(partial.value)).timeout(
      const Duration(milliseconds: 1500),
      onTimeout: () => partial.value,
    );
    return LiveResult(text: text.trim(), peakDb: _peakDb == -160 ? -20 : _peakDb, held: held);
  }
}
