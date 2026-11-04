import 'dart:async';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../languages.dart';

/// Voce → testo (riconoscimento sul dispositivo) e testo → voce.
class VoiceService {
  VoiceService._();
  static final VoiceService instance = VoiceService._();

  final SpeechToText _stt = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  bool _ready = false;
  List<String> _locales = [];
  void Function(SpeechRecognitionError error)? _onError;
  void Function(String status)? _onStatus;

  Future<bool> init() async {
    if (_ready) return true;
    _ready = await _stt.initialize(
      onError: (e) => _onError?.call(e),
      onStatus: (s) => _onStatus?.call(s),
    );
    if (_ready) {
      _locales = (await _stt.locales()).map((l) => l.localeId).toList();
    }
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
    return _ready;
  }

  bool get isListening => _stt.isListening;

  /// Trova l'id di locale del riconoscitore più adatto alla lingua.
  String? _sttLocale(Lang lang) {
    String norm(String s) => s.replaceAll('-', '_').toLowerCase();
    final wanted = norm(lang.locale);
    for (final id in _locales) {
      if (norm(id) == wanted) return id;
    }
    for (final id in _locales) {
      if (norm(id).startsWith('${lang.name}_') || norm(id) == lang.name) {
        return id;
      }
    }
    return lang.locale.replaceAll('-', '_');
  }

  /// Ascolta una frase. Prova prima il riconoscimento offline; se il
  /// pacchetto vocale offline non è installato ripiega sulla modalità
  /// standard del sistema e lo segnala con [onOfflineMissing].
  Future<String?> listen(
    Lang lang, {
    required void Function(String partial) onPartial,
    void Function()? onOfflineMissing,
  }) async {
    if (!await init()) return null;
    await _tts.stop();

    Future<String?> attempt({required bool onDevice}) {
      final done = Completer<String?>();
      String last = '';
      _onError = (e) {
        if (!done.isCompleted) done.completeError(e);
      };
      _onStatus = (s) {
        if ((s == SpeechToText.doneStatus || s == SpeechToText.notListeningStatus) &&
            !done.isCompleted) {
          // Lascia arrivare l'ultimo risultato finale prima di chiudere.
          Future.delayed(const Duration(milliseconds: 400), () {
            if (!done.isCompleted) done.complete(last);
          });
        }
      };
      _stt.listen(
        listenOptions: SpeechListenOptions(
          localeId: _sttLocale(lang),
          listenFor: const Duration(seconds: 30),
          pauseFor: const Duration(seconds: 3),
          onDevice: onDevice,
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.dictation,
        ),
        onResult: (SpeechRecognitionResult r) {
          last = r.recognizedWords;
          onPartial(last);
          if (r.finalResult && !done.isCompleted) done.complete(last);
        },
      );
      return done.future;
    }

    try {
      return await attempt(onDevice: true);
    } on SpeechRecognitionError catch (e) {
      // Nessun parlato rilevato: non è un problema di lingua offline.
      if (e.errorMsg == 'error_no_match' || e.errorMsg == 'error_speech_timeout') {
        return '';
      }
      onOfflineMissing?.call();
      try {
        return await attempt(onDevice: false);
      } on SpeechRecognitionError {
        return '';
      }
    }
  }

  Future<void> stopListening() => _stt.stop();

  Future<void> speak(String text, Lang lang) async {
    if (text.trim().isEmpty) return;
    await _tts.stop();
    await _tts.setLanguage(lang.locale);
    await _tts.setSpeechRate(0.5);
    await _tts.setPitch(1.0);
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() => _tts.stop();
}
