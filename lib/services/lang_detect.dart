import 'package:google_mlkit_language_id/google_mlkit_language_id.dart';

import '../languages.dart';

/// Riconosce la lingua di un testo, offline (ML Kit Language ID).
class LangDetect {
  LangDetect._();
  static final LangDetect instance = LangDetect._();

  final _id = LanguageIdentifier(confidenceThreshold: 0.3);

  /// Lingua supportata più probabile, oppure null se non riconosciuta.
  Future<Lang?> detect(String text) async {
    final t = text.trim();
    if (t.isEmpty) return null;
    // Scorciatoie affidabili basate sull'alfabeto.
    final script = scriptGuess(t);
    if (script != null) return script;
    try {
      final candidates = await _id.identifyPossibleLanguages(t);
      for (final c in candidates) {
        final l = Lang.fromCode(c.languageTag);
        if (l != null) return l;
      }
    } catch (_) {}
    return null;
  }

  /// Russo e cinese si riconoscono dall'alfabeto con certezza.
  static Lang? scriptGuess(String t) {
    var letters = 0, cyr = 0, han = 0;
    for (final r in t.runes) {
      if (r >= 0x0400 && r <= 0x04FF) {
        cyr++;
        letters++;
      } else if (r >= 0x4E00 && r <= 0x9FFF) {
        han++;
        letters++;
      } else if ((r >= 0x41 && r <= 0x5A) || (r >= 0x61 && r <= 0x7A) || (r >= 0xC0 && r <= 0x24F)) {
        letters++;
      }
    }
    if (letters == 0) return null;
    if (han / letters > 0.3) return Lang.zh;
    if (cyr / letters > 0.5) return Lang.ru;
    return null;
  }

  static int cyrillicLetters(String t) => t.runes.where((r) => r >= 0x0400 && r <= 0x04FF).length;
  static int allLetters(String t) => t.runes
      .where(
        (r) =>
            String.fromCharCode(r).toLowerCase() != String.fromCharCode(r).toUpperCase() ||
            (r >= 0x4E00 && r <= 0x9FFF),
      )
      .length;
}
