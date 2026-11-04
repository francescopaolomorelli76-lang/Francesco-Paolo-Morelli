import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:whisper_ggml/whisper_ggml.dart';

import '../languages.dart';
import 'lang_detect.dart';
import 'prefs.dart';

/// Lingua riconosciuta da un audio, con il testo trascritto da Whisper.
class Detected {
  Detected(this.lang, this.text);
  final Lang? lang;
  final String text;
}

/// - Riconoscimento della LINGUA di un audio (solo quando non è ancora nota):
///   Whisper "tiny" sul telefono, circa un secondo.
/// - Lettura ad alta voce della traduzione (sintesi vocale del sistema),
///   con volume e velocità regolabili dall'app.
class SpeechService {
  SpeechService._();
  static final SpeechService instance = SpeechService._();

  /// Modello multilingue "tiny" compresso (q5_1, ~31 MB), incluso nell'app.
  static const model = WhisperModel.tiny;
  static const _modelFile = 'ggml-tiny-q5_1.bin';
  static const _modelAsset = 'assets/models/$_modelFile';
  static final _modelUrl = Uri.parse('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$_modelFile');
  static const _native = MethodChannel('manga_vox/native');

  final _tts = FlutterTts();
  bool _ttsReady = false;
  String? _modelPathCache;

  // ───────────── impostazioni voce ─────────────

  double get volume => Prefs.number('tts_volume', 1.0);
  double get rate => Prefs.number('tts_rate', 0.5);
  bool get speakAloud => Prefs.flag('tts_on', fallback: true);
  Future<void> setVolume(double v) => Prefs.setNumber('tts_volume', v);
  Future<void> setRate(double v) => Prefs.setNumber('tts_rate', v);
  Future<void> setSpeakAloud(bool v) => Prefs.setFlag('tts_on', v);

  // ───────────── modello Whisper ─────────────

  Future<String> modelPath() async {
    if (_modelPathCache != null) return _modelPathCache!;
    final dir = await WhisperController.getModelDir();
    // Libera spazio: i modelli più grandi delle versioni precedenti non servono più.
    for (final old in ['ggml-base-q5_1.bin', 'ggml-small-q5_1.bin']) {
      final f = File('$dir/$old');
      if (await f.exists()) await f.delete().catchError((_) => f);
    }
    if (Platform.isIOS) {
      try {
        final p = await _native.invokeMethod<String>('assetPath', {'asset': _modelAsset});
        if (p != null && await File(p).exists()) return _modelPathCache = p;
      } catch (_) {}
    }
    return _modelPathCache = '$dir/$_modelFile';
  }

  Future<bool> modelReady() async {
    final f = File(await modelPath());
    return await f.exists() && await f.length() > 1000000;
  }

  /// Copia il modello incluso nell'app (solo Android; su iOS si legge sul posto).
  Future<bool> installBundledModel() async {
    if (await modelReady()) return true;
    final ByteData data;
    try {
      data = await rootBundle.load(_modelAsset);
    } catch (_) {
      return false;
    }
    final dest = File(await modelPath());
    await dest.parent.create(recursive: true);
    final tmp = File('${dest.path}.tmp');
    await tmp.writeAsBytes(data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes), flush: true);
    await tmp.rename(dest.path);
    return true;
  }

  /// Scarica il modello solo se non è incluso nell'app (ripresa e nuovi tentativi).
  Future<void> downloadModel(void Function(double) onProgress) async {
    if (await installBundledModel()) return;
    final dest = File(await modelPath());
    await dest.parent.create(recursive: true);
    final part = File('${dest.path}.part');
    for (var attempt = 1; ; attempt++) {
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 20);
      try {
        final have = await part.exists() ? await part.length() : 0;
        final req = await client.getUrl(_modelUrl);
        if (have > 0) req.headers.set(HttpHeaders.rangeHeader, 'bytes=$have-');
        final res = await req.close();
        final resumed = res.statusCode == 206;
        if (res.statusCode != 200 && !resumed) throw HttpException('HTTP ${res.statusCode}');
        final start = resumed ? have : 0;
        final total = res.contentLength > 0 ? res.contentLength + start : -1;
        var got = start;
        final sink = part.openWrite(mode: resumed ? FileMode.append : FileMode.write);
        try {
          await for (final chunk in res.timeout(const Duration(seconds: 30))) {
            sink.add(chunk);
            got += chunk.length;
            if (total > 0) onProgress(got / total);
          }
        } finally {
          await sink.close();
        }
        await part.rename(dest.path);
        return;
      } catch (e) {
        if (attempt >= 6) rethrow;
        await Future.delayed(Duration(seconds: 2 * attempt));
      } finally {
        client.close(force: true);
      }
    }
  }

  /// Riconosce la lingua parlata in un file audio (circa un secondo).
  Future<Detected> detect(String audioPath) async {
    final res = await Whisper(model: model).transcribe(
      transcribeRequest: TranscribeRequest(
        audio: audioPath,
        language: 'auto',
        isNoTimestamps: true,
        noContext: true,
        keepModelLoaded: true,
        suppressNonSpeechTokens: true,
        threads: 4,
      ),
      modelPath: await modelPath(),
    );
    final text = cleanTranscript(res.text);
    return Detected(await LangDetect.instance.detect(text), text);
  }

  /// Rimuove annotazioni tipo "[musica]" o "(ride)" prodotte da Whisper.
  static String cleanTranscript(String s) =>
      s.replaceAll(RegExp(r'\[[^\]]*\]|\([^)]*\)|\*[^*]*\*'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();

  // ───────────── sintesi vocale ─────────────

  Future<void> speak(String text, Lang lang, {bool force = false}) async {
    if (text.trim().isEmpty || (!speakAloud && !force)) return;
    if (!_ttsReady) {
      _ttsReady = true;
      await _tts.setSharedInstance(true);
      await _tts.setIosAudioCategory(IosTextToSpeechAudioCategory.playAndRecord, [
        IosTextToSpeechAudioCategoryOptions.defaultToSpeaker,
        IosTextToSpeechAudioCategoryOptions.allowBluetooth,
        IosTextToSpeechAudioCategoryOptions.allowBluetoothA2DP,
      ], IosTextToSpeechAudioMode.voicePrompt);
    }
    await _tts.stop();
    await _tts.setLanguage(lang.locale);
    await _tts.setVolume(volume);
    await _tts.setSpeechRate(rate);
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() => _tts.stop();
}
