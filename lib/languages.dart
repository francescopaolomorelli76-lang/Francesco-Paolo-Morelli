import 'dart:ui' as ui;

import 'package:google_mlkit_translation/google_mlkit_translation.dart';

/// Una lingua: tutte quelle che il traduttore offline sa tradurre (59).
/// Le 6 lingue "di base" sono incluse da subito; le altre si scaricano
/// dalla schermata 🌍 Lingue del mondo (vedi services/langs.dart).
class Lang {
  const Lang(this.name, this.label, this.itName, this.flag, this.mlkit, this.locale);

  /// Codice ISO della lingua ("it", "en", ...).
  final String name;

  /// Nome nella lingua stessa ("Italiano", "English", "日本語", ...).
  final String label;

  /// Nome in italiano ("Italiano", "Inglese", "Giapponese", ...).
  final String itName;
  final String flag;
  final TranslateLanguage mlkit;

  /// Locale BCP-47 per voce (riconoscimento e sintesi).
  final String locale;

  String get short => name.toUpperCase();

  @override
  String toString() => name;

  // Le 6 lingue di base.
  static const it = Lang('it', 'Italiano', 'Italiano', '🇮🇹', TranslateLanguage.italian, 'it-IT');
  static const en = Lang('en', 'English', 'Inglese', '🇬🇧', TranslateLanguage.english, 'en-US');
  static const de = Lang('de', 'Deutsch', 'Tedesco', '🇩🇪', TranslateLanguage.german, 'de-DE');
  static const fr = Lang('fr', 'Français', 'Francese', '🇫🇷', TranslateLanguage.french, 'fr-FR');
  static const ru = Lang('ru', 'Русский', 'Russo', '🇷🇺', TranslateLanguage.russian, 'ru-RU');
  static const zh = Lang('zh', '中文', 'Cinese', '🇨🇳', TranslateLanguage.chinese, 'zh-CN');

  /// Lingue di base, incluse da subito.
  static const List<Lang> values = [it, en, de, fr, ru, zh];

  /// Tutte le lingue disponibili per il download.
  static const List<Lang> all = [
    it, en, de, fr, ru, zh, //
    Lang('af', 'Afrikaans', 'Afrikaans', '🇿🇦', TranslateLanguage.afrikaans, 'af-ZA'),
    Lang('sq', 'Shqip', 'Albanese', '🇦🇱', TranslateLanguage.albanian, 'sq-AL'),
    Lang('ar', 'العربية', 'Arabo', '🇸🇦', TranslateLanguage.arabic, 'ar-SA'),
    Lang('be', 'Беларуская', 'Bielorusso', '🇧🇾', TranslateLanguage.belarusian, 'be-BY'),
    Lang('bn', 'বাংলা', 'Bengalese', '🇧🇩', TranslateLanguage.bengali, 'bn-IN'),
    Lang('bg', 'Български', 'Bulgaro', '🇧🇬', TranslateLanguage.bulgarian, 'bg-BG'),
    Lang('ca', 'Català', 'Catalano', '🇦🇩', TranslateLanguage.catalan, 'ca-ES'),
    Lang('hr', 'Hrvatski', 'Croato', '🇭🇷', TranslateLanguage.croatian, 'hr-HR'),
    Lang('cs', 'Čeština', 'Ceco', '🇨🇿', TranslateLanguage.czech, 'cs-CZ'),
    Lang('da', 'Dansk', 'Danese', '🇩🇰', TranslateLanguage.danish, 'da-DK'),
    Lang('nl', 'Nederlands', 'Olandese', '🇳🇱', TranslateLanguage.dutch, 'nl-NL'),
    Lang('eo', 'Esperanto', 'Esperanto', '🌍', TranslateLanguage.esperanto, 'eo'),
    Lang('et', 'Eesti', 'Estone', '🇪🇪', TranslateLanguage.estonian, 'et-EE'),
    Lang('fi', 'Suomi', 'Finlandese', '🇫🇮', TranslateLanguage.finnish, 'fi-FI'),
    Lang('gl', 'Galego', 'Galiziano', '🇪🇸', TranslateLanguage.galician, 'gl-ES'),
    Lang('ka', 'ქართული', 'Georgiano', '🇬🇪', TranslateLanguage.georgian, 'ka-GE'),
    Lang('el', 'Ελληνικά', 'Greco', '🇬🇷', TranslateLanguage.greek, 'el-GR'),
    Lang('gu', 'ગુજરાતી', 'Gujarati', '🇮🇳', TranslateLanguage.gujarati, 'gu-IN'),
    Lang('ht', 'Kreyòl ayisyen', 'Creolo haitiano', '🇭🇹', TranslateLanguage.haitian, 'ht-HT'),
    Lang('he', 'עברית', 'Ebraico', '🇮🇱', TranslateLanguage.hebrew, 'he-IL'),
    Lang('hi', 'हिन्दी', 'Hindi', '🇮🇳', TranslateLanguage.hindi, 'hi-IN'),
    Lang('hu', 'Magyar', 'Ungherese', '🇭🇺', TranslateLanguage.hungarian, 'hu-HU'),
    Lang('is', 'Íslenska', 'Islandese', '🇮🇸', TranslateLanguage.icelandic, 'is-IS'),
    Lang('id', 'Bahasa Indonesia', 'Indonesiano', '🇮🇩', TranslateLanguage.indonesian, 'id-ID'),
    Lang('ga', 'Gaeilge', 'Irlandese', '🇮🇪', TranslateLanguage.irish, 'ga-IE'),
    Lang('ja', '日本語', 'Giapponese', '🇯🇵', TranslateLanguage.japanese, 'ja-JP'),
    Lang('kn', 'ಕನ್ನಡ', 'Kannada', '🇮🇳', TranslateLanguage.kannada, 'kn-IN'),
    Lang('ko', '한국어', 'Coreano', '🇰🇷', TranslateLanguage.korean, 'ko-KR'),
    Lang('lv', 'Latviešu', 'Lettone', '🇱🇻', TranslateLanguage.latvian, 'lv-LV'),
    Lang('lt', 'Lietuvių', 'Lituano', '🇱🇹', TranslateLanguage.lithuanian, 'lt-LT'),
    Lang('mk', 'Македонски', 'Macedone', '🇲🇰', TranslateLanguage.macedonian, 'mk-MK'),
    Lang('ms', 'Bahasa Melayu', 'Malese', '🇲🇾', TranslateLanguage.malay, 'ms-MY'),
    Lang('mt', 'Malti', 'Maltese', '🇲🇹', TranslateLanguage.maltese, 'mt-MT'),
    Lang('mr', 'मराठी', 'Marathi', '🇮🇳', TranslateLanguage.marathi, 'mr-IN'),
    Lang('no', 'Norsk', 'Norvegese', '🇳🇴', TranslateLanguage.norwegian, 'nb-NO'),
    Lang('fa', 'فارسی', 'Persiano', '🇮🇷', TranslateLanguage.persian, 'fa-IR'),
    Lang('pl', 'Polski', 'Polacco', '🇵🇱', TranslateLanguage.polish, 'pl-PL'),
    Lang('pt', 'Português', 'Portoghese', '🇵🇹', TranslateLanguage.portuguese, 'pt-PT'),
    Lang('ro', 'Română', 'Rumeno', '🇷🇴', TranslateLanguage.romanian, 'ro-RO'),
    Lang('sk', 'Slovenčina', 'Slovacco', '🇸🇰', TranslateLanguage.slovak, 'sk-SK'),
    Lang('sl', 'Slovenščina', 'Sloveno', '🇸🇮', TranslateLanguage.slovenian, 'sl-SI'),
    Lang('es', 'Español', 'Spagnolo', '🇪🇸', TranslateLanguage.spanish, 'es-ES'),
    Lang('sw', 'Kiswahili', 'Swahili', '🇰🇪', TranslateLanguage.swahili, 'sw-KE'),
    Lang('sv', 'Svenska', 'Svedese', '🇸🇪', TranslateLanguage.swedish, 'sv-SE'),
    Lang('tl', 'Tagalog', 'Tagalog', '🇵🇭', TranslateLanguage.tagalog, 'fil-PH'),
    Lang('ta', 'தமிழ்', 'Tamil', '🇱🇰', TranslateLanguage.tamil, 'ta-IN'),
    Lang('te', 'తెలుగు', 'Telugu', '🇮🇳', TranslateLanguage.telugu, 'te-IN'),
    Lang('th', 'ไทย', 'Thailandese', '🇹🇭', TranslateLanguage.thai, 'th-TH'),
    Lang('tr', 'Türkçe', 'Turco', '🇹🇷', TranslateLanguage.turkish, 'tr-TR'),
    Lang('uk', 'Українська', 'Ucraino', '🇺🇦', TranslateLanguage.ukrainian, 'uk-UA'),
    Lang('ur', 'اردو', 'Urdu', '🇵🇰', TranslateLanguage.urdu, 'ur-PK'),
    Lang('vi', 'Tiếng Việt', 'Vietnamita', '🇻🇳', TranslateLanguage.vietnamese, 'vi-VN'),
    Lang('cy', 'Cymraeg', 'Gallese', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', TranslateLanguage.welsh, 'cy-GB'),
  ];

  static Lang fromName(String? name, Lang fallback) => all.firstWhere((l) => l.name == name, orElse: () => fallback);

  /// Da un codice lingua qualsiasi ("zh-Hans", "en_US", "iw", "nb") a [Lang].
  static Lang? fromCode(String? code) {
    if (code == null || code.isEmpty) return null;
    var base = code.toLowerCase().split(RegExp('[-_]')).first;
    base = const {'iw': 'he', 'in': 'id', 'nb': 'no', 'nn': 'no', 'fil': 'tl', 'ji': 'yi'}[base] ?? base;
    for (final l in all) {
      if (l.name == base) return l;
    }
    return null;
  }

  /// La lingua del telefono, se è tra quelle di base (altrimenti inglese).
  static Lang deviceDefault() {
    for (final loc in ui.PlatformDispatcher.instance.locales) {
      final l = fromCode(loc.languageCode);
      if (l != null && values.contains(l)) return l;
    }
    return en;
  }
}

/// Un paese: toccandolo si scarica la sua lingua.
class Country {
  const Country(this.iso, this.it, this.lang);

  /// Codice ISO del paese (per la bandiera) o una bandiera già pronta.
  final String iso;
  final String it;
  final String lang;

  String get flag =>
      iso.length == 2 ? String.fromCharCodes(iso.toUpperCase().codeUnits.map((c) => 0x1F1E6 + c - 65)) : iso;

  Lang get language => Lang.fromName(lang, Lang.en);

  static const List<Country> all = [
    Country('AF', 'Afghanistan', 'fa'),
    Country('AL', 'Albania', 'sq'),
    Country('DZ', 'Algeria', 'ar'),
    Country('AD', 'Andorra', 'ca'),
    Country('AO', 'Angola', 'pt'),
    Country('SA', 'Arabia Saudita', 'ar'),
    Country('AR', 'Argentina', 'es'),
    Country('AU', 'Australia', 'en'),
    Country('AT', 'Austria', 'de'),
    Country('BD', 'Bangladesh', 'bn'),
    Country('BE', 'Belgio (Fiandre)', 'nl'),
    Country('BE', 'Belgio (Vallonia)', 'fr'),
    Country('BY', 'Bielorussia', 'be'),
    Country('BO', 'Bolivia', 'es'),
    Country('BR', 'Brasile', 'pt'),
    Country('BG', 'Bulgaria', 'bg'),
    Country('CM', 'Camerun', 'fr'),
    Country('CA', 'Canada', 'en'),
    Country('CA', 'Canada (Québec)', 'fr'),
    Country('CV', 'Capo Verde', 'pt'),
    Country('CZ', 'Cechia', 'cs'),
    Country('CL', 'Cile', 'es'),
    Country('CN', 'Cina', 'zh'),
    Country('CY', 'Cipro', 'el'),
    Country('CO', 'Colombia', 'es'),
    Country('KR', 'Corea del Sud', 'ko'),
    Country('CI', 'Costa d\'Avorio', 'fr'),
    Country('CR', 'Costa Rica', 'es'),
    Country('HR', 'Croazia', 'hr'),
    Country('CU', 'Cuba', 'es'),
    Country('DK', 'Danimarca', 'da'),
    Country('EC', 'Ecuador', 'es'),
    Country('EG', 'Egitto', 'ar'),
    Country('SV', 'El Salvador', 'es'),
    Country('AE', 'Emirati Arabi Uniti', 'ar'),
    Country('🌍', 'Esperanto (lingua internazionale)', 'eo'),
    Country('EE', 'Estonia', 'et'),
    Country('PH', 'Filippine', 'tl'),
    Country('FI', 'Finlandia', 'fi'),
    Country('FR', 'Francia', 'fr'),
    Country('🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Galles', 'cy'),
    Country('GE', 'Georgia', 'ka'),
    Country('DE', 'Germania', 'de'),
    Country('GH', 'Ghana', 'en'),
    Country('JM', 'Giamaica', 'en'),
    Country('JP', 'Giappone', 'ja'),
    Country('JO', 'Giordania', 'ar'),
    Country('GR', 'Grecia', 'el'),
    Country('GT', 'Guatemala', 'es'),
    Country('HT', 'Haiti', 'ht'),
    Country('HN', 'Honduras', 'es'),
    Country('HK', 'Hong Kong', 'zh'),
    Country('IN', 'India (hindi)', 'hi'),
    Country('IN', 'India (bengalese)', 'bn'),
    Country('IN', 'India (gujarati)', 'gu'),
    Country('IN', 'India (kannada)', 'kn'),
    Country('IN', 'India (marathi)', 'mr'),
    Country('IN', 'India (tamil)', 'ta'),
    Country('IN', 'India (telugu)', 'te'),
    Country('ID', 'Indonesia', 'id'),
    Country('IR', 'Iran', 'fa'),
    Country('IQ', 'Iraq', 'ar'),
    Country('IE', 'Irlanda', 'en'),
    Country('IE', 'Irlanda (gaelico)', 'ga'),
    Country('IS', 'Islanda', 'is'),
    Country('IL', 'Israele', 'he'),
    Country('IT', 'Italia', 'it'),
    Country('KE', 'Kenya', 'sw'),
    Country('KW', 'Kuwait', 'ar'),
    Country('LV', 'Lettonia', 'lv'),
    Country('LB', 'Libano', 'ar'),
    Country('LY', 'Libia', 'ar'),
    Country('LI', 'Liechtenstein', 'de'),
    Country('LT', 'Lituania', 'lt'),
    Country('LU', 'Lussemburgo', 'fr'),
    Country('MK', 'Macedonia del Nord', 'mk'),
    Country('MY', 'Malesia', 'ms'),
    Country('MT', 'Malta', 'mt'),
    Country('MA', 'Marocco', 'ar'),
    Country('MX', 'Messico', 'es'),
    Country('MD', 'Moldavia', 'ro'),
    Country('MC', 'Monaco', 'fr'),
    Country('MZ', 'Mozambico', 'pt'),
    Country('NI', 'Nicaragua', 'es'),
    Country('NG', 'Nigeria', 'en'),
    Country('NO', 'Norvegia', 'no'),
    Country('NZ', 'Nuova Zelanda', 'en'),
    Country('NL', 'Paesi Bassi', 'nl'),
    Country('PK', 'Pakistan', 'ur'),
    Country('PA', 'Panama', 'es'),
    Country('PY', 'Paraguay', 'es'),
    Country('PE', 'Perù', 'es'),
    Country('PL', 'Polonia', 'pl'),
    Country('PT', 'Portogallo', 'pt'),
    Country('QA', 'Qatar', 'ar'),
    Country('GB', 'Regno Unito', 'en'),
    Country('DO', 'Repubblica Dominicana', 'es'),
    Country('RO', 'Romania', 'ro'),
    Country('RU', 'Russia', 'ru'),
    Country('SM', 'San Marino', 'it'),
    Country('SN', 'Senegal', 'fr'),
    Country('SY', 'Siria', 'ar'),
    Country('SK', 'Slovacchia', 'sk'),
    Country('SI', 'Slovenia', 'sl'),
    Country('ES', 'Spagna', 'es'),
    Country('ES', 'Spagna (Catalogna)', 'ca'),
    Country('ES', 'Spagna (Galizia)', 'gl'),
    Country('LK', 'Sri Lanka (tamil)', 'ta'),
    Country('US', 'Stati Uniti', 'en'),
    Country('ZA', 'Sudafrica', 'af'),
    Country('SE', 'Svezia', 'sv'),
    Country('CH', 'Svizzera (tedesca)', 'de'),
    Country('CH', 'Svizzera (francese)', 'fr'),
    Country('CH', 'Svizzera (italiana)', 'it'),
    Country('TW', 'Taiwan', 'zh'),
    Country('TZ', 'Tanzania', 'sw'),
    Country('TH', 'Thailandia', 'th'),
    Country('TN', 'Tunisia', 'ar'),
    Country('TR', 'Turchia', 'tr'),
    Country('UA', 'Ucraina', 'uk'),
    Country('UG', 'Uganda', 'sw'),
    Country('HU', 'Ungheria', 'hu'),
    Country('UY', 'Uruguay', 'es'),
    Country('VA', 'Vaticano', 'it'),
    Country('VE', 'Venezuela', 'es'),
    Country('VN', 'Vietnam', 'vi'),
  ];
}
