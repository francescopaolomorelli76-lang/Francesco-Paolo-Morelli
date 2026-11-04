import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';

/// Le lingue supportate dall'app. L'italiano è la lingua "di casa",
/// le altre cinque sono quelle richieste per il dialogo e lo scanner.
enum Lang {
  it('Italiano', '🇮🇹', 'IT', TranslateLanguage.italian, 'it-IT'),
  en('English', '🇬🇧', 'EN', TranslateLanguage.english, 'en-US'),
  de('Deutsch', '🇩🇪', 'DE', TranslateLanguage.german, 'de-DE'),
  fr('Français', '🇫🇷', 'FR', TranslateLanguage.french, 'fr-FR'),
  ru('Русский', '🇷🇺', 'RU', TranslateLanguage.russian, 'ru-RU'),
  zh('中文', '🇨🇳', 'ZH', TranslateLanguage.chinese, 'zh-CN');

  const Lang(this.label, this.flag, this.short, this.mlkit, this.locale);

  /// Nome nella lingua stessa.
  final String label;
  final String flag;
  final String short;
  final TranslateLanguage mlkit;

  /// Locale BCP-47 usato per voce (riconoscimento e sintesi).
  final String locale;

  /// Script da usare con ML Kit Text Recognition. Il russo (cirillico)
  /// non è supportato da ML Kit: usa l'OCR nativo (vedi OcrService).
  TextRecognitionScript get ocrScript =>
      this == Lang.zh ? TextRecognitionScript.chinese : TextRecognitionScript.latin;

  bool get usesNativeOcr => this == Lang.ru;

  static Lang fromName(String? name, Lang fallback) =>
      Lang.values.firstWhere((l) => l.name == name, orElse: () => fallback);
}
