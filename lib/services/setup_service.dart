import 'dart:async';

import 'package:wakelock_plus/wakelock_plus.dart';

import '../languages.dart';
import 'prefs.dart';
import 'speech_service.dart';
import 'translator_service.dart';

/// Cosa manca per funzionare completamente offline.
class SetupStatus {
  SetupStatus(this.missingLangs, this.voiceReady, {this.appleAvailable = false, this.appleMissing = const []});
  final List<Lang> missingLangs;
  final bool voiceReady;

  /// Traduttore Apple (iPhone con iOS 26+): qualità migliore, consigliato.
  final bool appleAvailable;
  final List<Lang> appleMissing;
  bool get appleComplete => !appleAvailable || appleMissing.isEmpty;

  bool get complete => missingLangs.isEmpty && voiceReady;
}

/// Prepara tutto: modello vocale (incluso nell'app, viene solo copiato) e
/// modelli di traduzione delle 6 lingue (scaricati da Google, una volta sola).
class SetupService {
  static Future<SetupStatus> status() async {
    final voice = await SpeechService.instance.installBundledModel() || await SpeechService.instance.modelReady();
    final tr = TranslatorService.instance;
    final missing = await tr.missing(Lang.values);
    final apple = await tr.appleAvailable();
    final appleMissing = apple ? await tr.appleMissing(Prefs.get('mine', Lang.deviceDefault())) : <Lang>[];
    return SetupStatus(missing, voice, appleAvailable: apple, appleMissing: appleMissing);
  }

  /// Scarica le lingue del traduttore Apple per la mia lingua.
  static Future<void> prepareApple() async {
    final tr = TranslatorService.instance;
    final mine = Prefs.get('mine', Lang.deviceDefault());
    await tr.prepareApple(mine, await tr.appleMissing(mine));
  }

  /// Scarica ciò che manca. Le lingue vengono scaricate in parallelo, ognuna
  /// con tempo massimo e nuovi tentativi; lo schermo resta acceso.
  /// Restituisce le lingue che non è stato possibile scaricare.
  static Future<List<Lang>> downloadAll(void Function(String step, double progress) onStep) async {
    await WakelockPlus.enable().catchError((_) {});
    try {
      final s = await status();
      final total = s.missingLangs.length + (s.voiceReady ? 0 : 1);
      if (total == 0) {
        if (s.appleAvailable && s.appleMissing.isNotEmpty) await prepareApple();
        onStep('Pronto!', 1);
        return [];
      }
      var done = 0.0;
      void report(String step) => onStep(step, (done / total).clamp(0.0, 1.0));

      if (!s.voiceReady) {
        await SpeechService.instance.downloadModel((p) => onStep('🎤 Voce offline ${(p * 100).round()}%', p / total));
        done += 1;
      }

      final failed = <Lang>[];
      final pending = s.missingLangs.toSet();
      String names() => pending.map((l) => l.flag).join(' ');
      report('Lingue: ${names()}');
      await Future.wait(
        s.missingLangs.map((l) async {
          final ok = await _downloadLang(l);
          pending.remove(l);
          if (!ok) failed.add(l);
          done += 1;
          report(pending.isEmpty ? 'Quasi fatto…' : 'Lingue: ${names()}');
        }),
      );
      if (s.appleAvailable && s.appleMissing.isNotEmpty) {
        onStep('🍎 Traduttore Apple: conferma i download', 1);
        await prepareApple();
      }
      onStep(failed.isEmpty ? 'Pronto!' : 'Alcune lingue non scaricate', 1);
      return failed;
    } finally {
      await WakelockPlus.disable().catchError((_) {});
    }
  }

  static Future<bool> _downloadLang(Lang l) async {
    final tr = TranslatorService.instance;
    for (var attempt = 1; attempt <= 3; attempt++) {
      try {
        final ok = await tr.download(l).timeout(const Duration(minutes: 4));
        if (ok || await tr.isDownloaded(l)) return true;
      } catch (_) {
        if (await tr.isDownloaded(l).catchError((_) => false)) return true;
      }
      await Future.delayed(Duration(seconds: 3 * attempt));
    }
    return false;
  }
}
