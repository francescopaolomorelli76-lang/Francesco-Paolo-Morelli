import 'dart:async';
import 'dart:io';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:whisper_ggml/whisper_ggml.dart';

import '../languages.dart';

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
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.wav, sampleRate: 16000, numChannels: 1),
      path: _path!,
    );
    _startedAt = DateTime.now();
    return true;
  }

  Future<void> cancelRecording() async {
    try {
      await _recorder.cancel();
    } catch (_) {}
  }

  /// Ferma la registrazione (pulsante rilasciato) e trascrive.
  /// Restituisce null se la pressione è stata troppo breve.
  Future<String?> stopAndTranscribe() async {
    final path = await _recorder.stop() ?? _path;
    final held = DateTime.now().difference(_startedAt ?? DateTime.now());
    if (path == null) return null;
    final file = File(path);
    try {
      if (held < const Duration(milliseconds: 500)) return null;
      final r = await _whisper.transcribe(
        model: model,
        audioPath: path,
        lang: 'auto',
        keepModelLoaded: true,
        suppressNonSpeechTokens: true,
        noContext: true,
      );
      return cleanTranscript(r?.transcription.text ?? '');
    } finally {
      if (await file.exists()) await file.delete();
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
      await _tts.setIosAudioCategory(
        IosTextToSpeechAudioCategory.playAndRecord,
        [
          IosTextToSpeechAudioCategoryOptions.defaultToSpeaker,
          IosTextToSpeechAudioCategoryOptions.allowBluetooth,
          IosTextToSpeechAudioCategoryOptions.allowBluetoothA2DP,
        ],
        IosTextToSpeechAudioMode.voicePrompt,
      );
    }
    await _tts.stop();
    await _tts.setLanguage(lang.locale);
    await _tts.setSpeechRate(0.5);
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() => _tts.stop();
}
