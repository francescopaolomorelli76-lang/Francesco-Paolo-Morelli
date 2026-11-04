import 'package:google_mlkit_translation/google_mlkit_translation.dart';

import '../languages.dart';

/// Il pacchetto di traduzione di una lingua non è sul telefono.
class MissingLanguage implements Exception {
  MissingLanguage(this.lang);
  final Lang lang;
  @override
  String toString() => 'Manca il pacchetto lingua ${lang.label}';
}

/// Traduzione 100% sul dispositivo con ML Kit.
/// I modelli (~30 MB per lingua) vanno scaricati una sola volta,
/// poi la traduzione funziona senza connessione.
class TranslatorService {
  TranslatorService._();
  static final TranslatorService instance = TranslatorService._();

  final _manager = OnDeviceTranslatorModelManager();
  final Map<String, OnDeviceTranslator> _cache = {};
  final Set<Lang> _ready = {};

  Future<bool> isDownloaded(Lang lang) async {
    if (_ready.contains(lang)) return true;
    final ok = await _manager.isModelDownloaded(lang.mlkit.bcpCode);
    if (ok) _ready.add(lang);
    return ok;
  }

  Future<bool> download(Lang lang) async {
    final ok = await _manager.downloadModel(lang.mlkit.bcpCode, isWifiRequired: false);
    if (ok) _ready.add(lang);
    return ok;
  }

  Future<bool> delete(Lang lang) {
    _ready.remove(lang);
    return _manager.deleteModel(lang.mlkit.bcpCode);
  }

  /// Lingue il cui modello manca sul dispositivo.
  Future<List<Lang>> missing(Iterable<Lang> langs) async {
    final out = <Lang>[];
    for (final l in langs) {
      if (!await isDownloaded(l)) out.add(l);
    }
    return out;
  }

  /// Traduce; lancia [MissingLanguage] se manca un pacchetto (invece di
  /// restare bloccato a cercare di scaricarlo senza rete).
  Future<String> translate(String text, Lang from, Lang to) async {
    final clean = text.trim();
    if (clean.isEmpty || from == to) return clean;
    for (final l in [from, to]) {
      if (!await isDownloaded(l)) throw MissingLanguage(l);
    }
    final key = '${from.name}>${to.name}';
    final translator = _cache[key] ??= OnDeviceTranslator(sourceLanguage: from.mlkit, targetLanguage: to.mlkit);
    return translator.translateText(clean);
  }

  Future<void> dispose() async {
    for (final t in _cache.values) {
      await t.close();
    }
    _cache.clear();
  }
}
