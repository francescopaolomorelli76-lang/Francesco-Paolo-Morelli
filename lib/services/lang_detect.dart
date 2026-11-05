import 'package:google_mlkit_language_id/google_mlkit_language_id.dart';

import '../languages.dart';

enum Script { cyrillic, han, kana, hangul, other }

/// Riconosce la lingua di un testo, offline (ML Kit Language ID).
class LangDetect {
  LangDetect._();
  static final LangDetect instance = LangDetect._();

  final _id = LanguageIdentifier(confidenceThreshold: 0.3);

  /// Lingua più probabile (tra tutte quelle conosciute), o null.
  /// Chi la usa controlla se è installata (Langs.isInstalled).
  Future<Lang?> detect(String text) async {
    final t = text.trim();
    if (t.isEmpty) return null;
    final script = scriptOf(t);
    List<Lang> candidates = [];
    try {
      final ids = await _id.identifyPossibleLanguages(t);
      candidates = [for (final c in ids) ?Lang.fromCode(c.languageTag)];
    } catch (_) {}
    // L'alfabeto decide con certezza alcune lingue.
    switch (script) {
      case Script.kana:
        return Lang.fromName('ja', Lang.zh);
      case Script.han:
        return Lang.zh;
      case Script.hangul:
        return Lang.fromName('ko', Lang.en);
      case Script.cyrillic:
        const cyrillic = {'ru', 'uk', 'bg', 'be', 'mk'};
        for (final l in candidates) {
          if (cyrillic.contains(l.name)) return l;
        }
        return Lang.ru;
      case Script.other:
        return candidates.isEmpty ? null : candidates.first;
    }
  }

  /// Alfabeto prevalente del testo.
  static Script scriptOf(String t) {
    var letters = 0, cyr = 0, han = 0, kana = 0, hangul = 0;
    for (final r in t.runes) {
      if (r >= 0x0400 && r <= 0x04FF) {
        cyr++;
      } else if (r >= 0x3040 && r <= 0x30FF) {
        kana++;
      } else if (r >= 0xAC00 && r <= 0xD7AF) {
        hangul++;
      } else if (r >= 0x4E00 && r <= 0x9FFF) {
        han++;
      } else if (String.fromCharCode(r).toLowerCase() == String.fromCharCode(r).toUpperCase()) {
        continue;
      }
      letters++;
    }
    if (letters == 0) return Script.other;
    if (kana > 0 && (kana + han) / letters > 0.3) return Script.kana;
    if (hangul / letters > 0.3) return Script.hangul;
    if (han / letters > 0.3) return Script.han;
    if (cyr / letters > 0.5) return Script.cyrillic;
    return Script.other;
  }

  /// Compatibilità: russo e cinese riconosciuti dall'alfabeto.
  static Lang? scriptGuess(String t) => switch (scriptOf(t)) {
    Script.han => Lang.zh,
    Script.cyrillic => Lang.ru,
    _ => null,
  };

  static int cyrillicLetters(String t) => t.runes.where((r) => r >= 0x0400 && r <= 0x04FF).length;
  static int allLetters(String t) => t.runes
      .where(
        (r) =>
            String.fromCharCode(r).toLowerCase() != String.fromCharCode(r).toUpperCase() ||
            (r >= 0x4E00 && r <= 0x9FFF),
      )
      .length;
}
