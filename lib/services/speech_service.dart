import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:whisper_ggml/whisper_ggml.dart';

import '../languages.dart';
import 'lang_detect.dart';
import 'pitch.dart';
import 'prefs.dart';

/// Una voce di sintesi installata sul telefono.
class TtsVoice {
  TtsVoice({required this.id, required this.name, required this.locale, required this.quality, this.gender});
  final String id, name, locale;

  /// "premium", "enhanced" o "default".
  final String quality;
  final VoiceGender? gender;

  int get rank => switch (quality) {
    'premium' => 3,
    'enhanced' => 2,
    _ => 1,
  };

  String get qualityLabel => switch (quality) {
    'premium' => '⭐ Premium',
    'enhanced' => 'Migliorata',
    _ => 'Base',
  };

  Map<String, String> get asMap => {'identifier': id, 'name': name, 'locale': locale};
}

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

  // ───────────── voci ─────────────

  List<TtsVoice>? _voices;

  /// Uomo/donna come chi parla (riconosciuto dal tono della voce).
  bool get autoGender => Prefs.flag('voice_auto', fallback: true);
  Future<void> setAutoGender(bool v) => Prefs.setFlag('voice_auto', v);

  /// Voce usata quando il genere non è automatico o non si riconosce.
  VoiceGender get defaultGender =>
      Prefs.str('voice_default', 'female') == 'male' ? VoiceGender.male : VoiceGender.female;
  Future<void> setDefaultGender(VoiceGender g) => Prefs.setStr('voice_default', g.name);

  /// Voce scelta dall'utente per lingua e genere ('' = automatica, la migliore).
  String chosenVoiceId(Lang l, VoiceGender g) => Prefs.str('voice_${l.name}_${g.name}');
  Future<void> setChosenVoice(Lang l, VoiceGender g, String id) => Prefs.setStr('voice_${l.name}_${g.name}', id);

  /// Ricarica l'elenco (dopo aver scaricato nuove voci nelle impostazioni).
  void refreshVoices() => _voices = null;

  /// Voci installate per una lingua, dalla migliore. Esclude le voci
  /// "giocattolo" e quelle robotiche di sistema.
  Future<List<TtsVoice>> voicesFor(Lang lang) async {
    if (_voices == null) {
      final out = <TtsVoice>[];
      try {
        final raw = await _tts.getVoices;
        for (final v in (raw as List? ?? [])) {
          if (v is! Map) continue;
          final id = '${v['identifier'] ?? v['name'] ?? ''}';
          if (id.isEmpty || id.contains('speech.synthesis.voice') || id.contains('eloquence')) continue;
          final g = '${v['gender'] ?? ''}';
          out.add(
            TtsVoice(
              id: id,
              name: '${v['name'] ?? id}',
              locale: '${v['locale'] ?? ''}'.replaceAll('_', '-'),
              quality: '${v['quality'] ?? 'default'}',
              gender: g == 'male' ? VoiceGender.male : (g == 'female' ? VoiceGender.female : null),
            ),
          );
        }
      } catch (_) {}
      _voices = out;
    }
    final code = lang.locale.split('-').first.toLowerCase();
    final list = _voices!.where((v) => v.locale.toLowerCase().split('-').first == code).toList();
    list.sort((a, b) {
      final exact = (b.locale == lang.locale ? 1 : 0) - (a.locale == lang.locale ? 1 : 0);
      if (b.rank != a.rank) return b.rank - a.rank;
      if (exact != 0) return exact;
      return a.name.compareTo(b.name);
    });
    return list;
  }

  /// La voce da usare: quella scelta, altrimenti la migliore del genere giusto.
  Future<TtsVoice?> pickVoice(Lang lang, VoiceGender gender) async {
    final all = await voicesFor(lang);
    if (all.isEmpty) return null;
    final chosen = chosenVoiceId(lang, gender);
    if (chosen.isNotEmpty) {
      for (final v in all) {
        if (v.id == chosen) return v;
      }
    }
    for (final v in all) {
      if (v.gender == gender) return v;
    }
    return all.first;
  }

  // ───────────── sintesi vocale ─────────────

  /// Legge [text] in [lang]. [gender] = genere di chi ha parlato (se noto):
  /// con "uomo/donna automatico" la traduzione usa una voce dello stesso genere.
  Future<void> speak(String text, Lang lang, {VoiceGender? gender, TtsVoice? voice, bool force = false}) async {
    if (text.trim().isEmpty || (!speakAloud && !force)) return;
    final g = (autoGender ? gender : null) ?? defaultGender;
    final v = voice ?? await pickVoice(lang, g);
    await _tts.stop();
    if (Platform.isIOS) {
      // Modalità "riproduzione": volume pieno e altoparlante (la modalità
      // registrazione dell'iPhone abbassa il volume). Il microfono la
      // reimposta da solo quando si preme di nuovo un pulsante.
      await _tts.setIosAudioCategory(IosTextToSpeechAudioCategory.playback, [
        IosTextToSpeechAudioCategoryOptions.duckOthers,
      ], IosTextToSpeechAudioMode.defaultMode);
      await _tts.setSharedInstance(true);
    }
    await _tts.setLanguage(lang.locale);
    if (v != null) {
      try {
        await _tts.setVoice(v.asMap);
      } catch (_) {}
    }
    await _tts.setVolume(volume);
    await _tts.setSpeechRate(rate);
    await _tts.setPitch(1.0);
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() => _tts.stop();
}
