import '../languages.dart';
import 'speech_service.dart';
import 'translator_service.dart';

/// Cosa manca per funzionare completamente offline.
class SetupStatus {
  SetupStatus(this.missingLangs, this.voiceReady);
  final List<Lang> missingLangs;
  final bool voiceReady;
  bool get complete => missingLangs.isEmpty && voiceReady;
}

/// Prepara tutto in un colpo: modelli di traduzione delle 6 lingue
/// (servono tutti, perché la lingua dell'interlocutore è riconosciuta
/// automaticamente) e il modello vocale.
class SetupService {
  static Future<SetupStatus> status() async {
    final missing = await TranslatorService.instance.missing(Lang.values);
    final voice = await SpeechService.instance.modelReady();
    return SetupStatus(missing, voice);
  }

  /// [onStep] riceve testo descrittivo e avanzamento complessivo 0..1.
  static Future<void> downloadAll(void Function(String step, double progress) onStep) async {
    final s = await status();
    final steps = s.missingLangs.length + (s.voiceReady ? 0 : 1);
    var done = 0;
    if (!s.voiceReady) {
      await SpeechService.instance.downloadModel((p) => onStep('Voce offline', (done + p) / steps));
      done++;
    }
    for (final l in s.missingLangs) {
      onStep('${l.flag} ${l.label}', done / steps);
      final ok = await TranslatorService.instance.download(l);
      if (!ok) throw Exception('Download di ${l.label} non riuscito');
      done++;
    }
    onStep('Pronto!', 1);
  }
}
