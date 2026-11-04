import 'dart:async';
import 'dart:io';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:whisper_ggml/whisper_ggml.dart';

import 'package:flutter/foundation.dart';

import '../languages.dart';

/// Esito di una registrazione: testo, oppure il motivo per cui manca.
class Heard {
  Heard({this.text = '', this.error, this.tooShort = false, required this.peakDb, required this.held});
  final String text;
  final String? error;
  final bool tooShort;

  /// Volume massimo registrato (dBFS: 0 = fortissimo, -160 = silenzio).
  final double peakDb;
  final Duration held;

  bool get silent => peakDb < -45;
  String get debug =>
      'audio ${(held.inMilliseconds / 1000).toStringAsFixed(1)} s, picco ${peakDb.toStringAsFixed(0)} dB';
}

/// Voce sul dispositivo, senza rete:
/// - registrazione mentre il pulsante è premuto;
/// - trascrizione con Whisper in modalità "auto" (riconosce qualsiasi lingua);
/// - lettura ad alta voce della traduzione con la sintesi vocale del sistema.
class SpeechService {
  SpeechService._();
  static final SpeechService instance = SpeechService._();

  /// Modello multilingue "base" (~150 MB): buon compromesso velocità/qualità.
  static const model = WhisperModel.base;

  AudioRecorder? _rec;
  AudioRecorder get _recorder => _rec ??= AudioRecorder();
  final _whisper = WhisperController();
  final _tts = FlutterTts();
  bool _ttsReady = false;
  DateTime? _startedAt;
  String? _path;
  Timer? _meter;
  double _peakDb = -160;

  /// Livello del microfono 0..1, aggiornato mentre si registra (per la UI).
  final ValueNotifier<double> level = ValueNotifier(0);

  Future<bool> modelReady() async => File(await _whisper.getPath(model)).exists();

  /// Scarica il modello vocale con avanzamento (0..1).
  Future<void> downloadModel(void Function(double) onProgress) async {
    final dest = File(await _whisper.getPath(model));
    if (await dest.exists()) return;
    await dest.parent.create(recursive: true);
    final part = File('${dest.path}.part');
    final client = HttpClient();
    try {
      final res = await (await client.getUrl(model.modelUri)).close();
      if (res.statusCode != 200) throw HttpException('HTTP ${res.statusCode}');
      final total = res.contentLength;
      var got = 0;
      final sink = part.openWrite();
      await for (final chunk in res) {
        sink.add(chunk);
        got += chunk.length;
        if (total > 0) onProgress(got / total);
      }
      await sink.close();
      await part.rename(dest.path);
    } finally {
      client.close();
      if (await part.exists()) await part.delete();
    }
  }

  Future<bool> hasMicPermission() => _recorder.hasPermission();

  /// Inizia a registrare (pulsante premuto).
  Future<bool> startRecording() async {
    if (!await _recorder.hasPermission()) return false;
    await _tts.stop();
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/mv_${DateTime.now().millisecondsSinceEpoch}.wav';
    _peakDb = -160;
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.wav,
        sampleRate: 16000,
        numChannels: 1,
        iosConfig: IosRecordConfig(
          categoryOptions: [IosAudioCategoryOption.defaultToSpeaker, IosAudioCategoryOption.allowBluetooth],
        ),
      ),
      path: _path!,
    );
    _startedAt = DateTime.now();
    _meter?.cancel();
    _meter = Timer.periodic(const Duration(milliseconds: 80), (_) async {
      try {
        final a = await _recorder.getAmplitude();
        if (a.current.isFinite) {
          if (a.current > _peakDb) _peakDb = a.current;
          level.value = ((a.current + 50) / 50).clamp(0.0, 1.0);
        }
      } catch (_) {}
    });
    return true;
  }

  void _stopMeter() {
    _meter?.cancel();
    _meter = null;
    level.value = 0;
  }

  Future<void> cancelRecording() async {
    _stopMeter();
    try {
      await _recorder.cancel();
    } catch (_) {}
  }

  /// Ferma la registrazione (pulsante rilasciato) e trascrive con Whisper,
  /// riconoscendo la lingua da solo.
  Future<Heard> stopAndTranscribe() async {
    _stopMeter();
    final path = await _recorder.stop() ?? _path;
    final held = DateTime.now().difference(_startedAt ?? DateTime.now());
    final peak = _peakDb;
    if (path == null) return Heard(error: 'registrazione non salvata', peakDb: peak, held: held);
    final file = File(path);
    try {
      if (held < const Duration(milliseconds: 500)) return Heard(tooShort: true, peakDb: peak, held: held);
      final res = await Whisper(model: model).transcribe(
        transcribeRequest: TranscribeRequest(
          audio: path,
          language: 'auto',
          isNoTimestamps: true,
          noContext: true,
          keepModelLoaded: true,
          suppressNonSpeechTokens: true,
        ),
        modelPath: await _whisper.getPath(model),
      );
      return Heard(text: cleanTranscript(res.text), peakDb: peak, held: held);
    } catch (e) {
      return Heard(error: '$e', peakDb: peak, held: held);
    } finally {
      for (final f in [file, File('$path.wav')]) {
        if (await f.exists()) await f.delete();
      }
    }
  }

  /// Rimuove annotazioni tipo "[musica]" o "(ride)" prodotte da Whisper.
  static String cleanTranscript(String s) =>
      s.replaceAll(RegExp(r'\[[^\]]*\]|\([^)]*\)|\*[^*]*\*'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();

  Future<void> speak(String text, Lang lang) async {
    if (text.trim().isEmpty) return;
    if (!_ttsReady) {
      _ttsReady = true;
      await _tts.awaitSpeakCompletion(true);
      await _tts.setSharedInstance(true);
      await _tts.setIosAudioCategory(IosTextToSpeechAudioCategory.playAndRecord, [
        IosTextToSpeechAudioCategoryOptions.defaultToSpeaker,
        IosTextToSpeechAudioCategoryOptions.allowBluetooth,
        IosTextToSpeechAudioCategoryOptions.allowBluetoothA2DP,
      ], IosTextToSpeechAudioMode.voicePrompt);
    }
    await _tts.stop();
    await _tts.setLanguage(lang.locale);
    await _tts.setSpeechRate(0.5);
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() => _tts.stop();
}
