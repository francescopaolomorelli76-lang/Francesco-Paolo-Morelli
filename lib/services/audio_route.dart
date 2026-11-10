import 'dart:io';

import 'package:flutter/services.dart';

import 'prefs.dart';

/// Dove si deve sentire una traduzione.
enum Hearer {
  /// L'interlocutore: altoparlante del telefono.
  partner,

  /// Io: cuffie/AirPods se collegate, altrimenti altoparlante.
  me,
}

/// Modalità cuffie (iPhone): con AirPods o cuffie collegate
/// - pulsante IO: parlo nel microfono delle cuffie, la traduzione esce
///   dall'altoparlante del telefono per l'altra persona;
/// - pulsante LUI/LEI: l'altro parla nel microfono del telefono, la
///   traduzione la sento io nelle cuffie.
/// Senza cuffie tutto esce dall'altoparlante, come sempre.
class AudioRoute {
  static const _ch = MethodChannel('manga_vox/audio_route');

  static bool get enabled => Prefs.flag('headset_mode', fallback: true);
  static Future<void> setEnabled(bool v) => Prefs.setFlag('headset_mode', v);

  /// Cuffie collegate? Restituisce (collegate, nome).
  static Future<(bool, String)> status() async {
    if (!Platform.isIOS) return (false, '');
    try {
      final m = Map<String, dynamic>.from(await _ch.invokeMethod('status') as Map);
      return (m['headphones'] == true, '${m['name'] ?? ''}');
    } catch (_) {
      return (false, '');
    }
  }

  /// Prepara l'uscita audio prima di leggere una traduzione.
  static Future<void> prepareFor(Hearer who) async {
    if (!Platform.isIOS) return;
    try {
      if (enabled && who == Hearer.partner) {
        await _ch.invokeMethod('toSpeaker');
      } else {
        await _ch.invokeMethod('toHeadphones');
      }
    } catch (_) {}
  }
}
