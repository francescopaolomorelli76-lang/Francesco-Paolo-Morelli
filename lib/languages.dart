import 'dart:ui' as ui;

import 'package:google_mlkit_translation/google_mlkit_translation.dart';

/// Le lingue supportate. La "mia lingua" si prende dalle impostazioni del
/// telefono; quella dell'interlocutore viene riconosciuta automaticamente.
enum Lang {
  it('Italiano', '🇮🇹', 'IT', TranslateLanguage.italian, 'it-IT'),
  en('English', '🇬🇧', 'EN', TranslateLanguage.english, 'en-US'),
  de('Deutsch', '🇩🇪', 'DE', TranslateLanguage.german, 'de-DE'),
  fr('Français', '🇫🇷', 'FR', TranslateLanguage.french, 'fr-FR'),
  ru('Русский', '🇷🇺', 'RU', TranslateLanguage.russian, 'ru-RU'),
  zh('中文', '🇨🇳', 'ZH', TranslateLanguage.chinese, 'zh-CN');

  const Lang(this.label, this.flag, this.short, this.mlkit, this.locale);

  final String label;
  final String flag;
  final String short;
  final TranslateLanguage mlkit;

  /// Locale BCP-47 per la sintesi vocale.
  final String locale;

  /// Il cirillico non è letto da ML Kit: usa l'OCR nativo (vedi OcrService).
  bool get usesNativeOcr => this == Lang.ru;

  static Lang fromName(String? name, Lang fallback) =>
      Lang.values.firstWhere((l) => l.name == name, orElse: () => fallback);

  /// Da un codice lingua qualsiasi ("zh-Hans", "en_US", "ru") a [Lang], se supportata.
  static Lang? fromCode(String? code) {
    if (code == null || code.isEmpty) return null;
    final base = code.toLowerCase().split(RegExp('[-_]')).first;
    for (final l in Lang.values) {
      if (l.name == base) return l;
    }
    return null;
  }

  /// La lingua del telefono, se è tra quelle supportate (altrimenti inglese).
  static Lang deviceDefault() {
    for (final loc in ui.PlatformDispatcher.instance.locales) {
      final l = fromCode(loc.languageCode);
      if (l != null) return l;
    }
    return Lang.en;
  }
}
