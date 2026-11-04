import 'dart:async';
import 'dart:io';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:whisper_ggml/whisper_ggml.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

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

  /// Modello multilingue "small" compresso (q5_1, ~181 MB): molto più preciso
  /// del "base" su italiano e francese, ancora veloce sul telefono.
  /// Incluso nell'app (assets/models): su iOS viene letto direttamente
  /// dall'app, su Android copiato al primo avvio; scaricato solo se manca.
  static const model = WhisperModel.small;
  static const _modelFile = 'ggml-small-q5_1.bin';
  static const _modelAsset = 'assets/models/$_modelFile';
  static final _modelUrl = Uri.parse('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$_modelFile');

  AudioRecorder? _rec;
  AudioRecorder get _recorder => _rec ??= AudioRecorder();
  final _tts = FlutterTts();
  bool _ttsReady = false;
  DateTime? _startedAt;
  String? _path;
  Timer? _meter;
  double _peakDb = -160;

  /// Livello del microfono 0..1, aggiornato mentre si registra (per la UI).
  final ValueNotifier<double> level = ValueNotifier(0);

  String? _modelPathCache;
  static const _native = MethodChannel('manga_vox/native');

  /// Su iOS il modello incluso si legge direttamente dal pacchetto dell'app
  /// (niente copia da 181 MB); altrimenti dalla cartella dei modelli.
  Future<String> modelPath() async {
    if (_modelPathCache != null) return _modelPathCache!;
    final dir = await WhisperController.getModelDir();
    // Libera spazio: il vecchio modello "base" delle prime versioni non serve più.
    final old = File('$dir/ggml-base-q5_1.bin');
    if (await old.exists()) await old.delete().catchError((_) => old);
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

  /// Copia il modello incluso nell'app nella cartella dei modelli.
  /// Restituisce false se l'app è stata compilata senza modello incluso.
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

  /// Scarica il modello vocale (solo se non incluso), con ripresa del
  /// download interrotto e timeout se la rete si blocca. Avanzamento 0..1.
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
          // Se per 30 secondi non arriva nulla, la connessione è bloccata: riprova.
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
        modelPath: await modelPath(),
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
