import 'package:google_mlkit_translation/google_mlkit_translation.dart';

import '../languages.dart';

/// Traduzione 100% sul dispositivo con ML Kit.
/// I modelli (~30 MB per lingua) vanno scaricati una sola volta,
/// poi la traduzione funziona senza connessione.
class TranslatorService {
  TranslatorService._();
  static final TranslatorService instance = TranslatorService._();

  final _manager = OnDeviceTranslatorModelManager();
  final Map<String, OnDeviceTranslator> _cache = {};

  Future<bool> isDownloaded(Lang lang) => _manager.isModelDownloaded(lang.mlkit.bcpCode);

  Future<bool> download(Lang lang) => _manager.downloadModel(lang.mlkit.bcpCode, isWifiRequired: false);

  Future<bool> delete(Lang lang) => _manager.deleteModel(lang.mlkit.bcpCode);

  /// Lingue il cui modello manca sul dispositivo.
  Future<List<Lang>> missing(Iterable<Lang> langs) async {
    final out = <Lang>[];
    for (final l in langs) {
      if (!await isDownloaded(l)) out.add(l);
    }
    return out;
  }

  Future<String> translate(String text, Lang from, Lang to) async {
    final clean = text.trim();
    if (clean.isEmpty || from == to) return clean;
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
