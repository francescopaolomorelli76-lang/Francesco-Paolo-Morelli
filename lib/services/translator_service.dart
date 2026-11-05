import 'dart:io';

import 'package:flutter/services.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';

import '../languages.dart';
import 'langs.dart';

/// Il pacchetto di traduzione di una lingua non è sul telefono.
class MissingLanguage implements Exception {
  MissingLanguage(this.lang);
  final Lang lang;
  @override
  String toString() => 'Manca il pacchetto lingua ${lang.label}';
}

/// Traduzione 100% sul dispositivo.
/// - iPhone con iOS 26+: traduttore di Apple (lo stesso dell'app Traduci),
///   qualità molto più alta, se le lingue sono scaricate.
/// - Altrimenti, e come riserva: Google ML Kit (~30 MB per lingua).
class TranslatorService {
  TranslatorService._();
  static final TranslatorService instance = TranslatorService._();

  final _manager = OnDeviceTranslatorModelManager();
  final Map<String, OnDeviceTranslator> _cache = {};
  final Set<Lang> _ready = {};

  static const _apple = MethodChannel('manga_vox/apple_translate');
  bool? _appleAvailable;
  final Set<String> _appleInstalled = {};

  static String appleCode(Lang l) => l == Lang.zh ? 'zh-Hans' : l.name;

  /// true se questo iPhone può usare il traduttore Apple (iOS 26+).
  Future<bool> appleAvailable() async {
    if (!Platform.isIOS) return false;
    if (_appleAvailable != null) return _appleAvailable!;
    try {
      final s = await _apple.invokeMethod<String>('status', {'from': 'en', 'to': 'it'});
      _appleAvailable = s != null && s != 'unavailable';
    } catch (_) {
      _appleAvailable = false;
    }
    return _appleAvailable!;
  }

  /// La coppia di lingue Apple è già scaricata sul telefono?
  Future<bool> appleReady(Lang from, Lang to) async {
    final key = '${from.name}>${to.name}';
    if (_appleInstalled.contains(key)) return true;
    if (!await appleAvailable()) return false;
    try {
      final s = await _apple.invokeMethod<String>('status', {'from': appleCode(from), 'to': appleCode(to)});
      if (s == 'installed') {
        _appleInstalled.add(key);
        return true;
      }
    } catch (_) {}
    return false;
  }

  /// Lingue (diverse dalla mia) per cui il traduttore Apple non è pronto.
  Future<List<Lang>> appleMissing(Lang mine) async {
    if (!await appleAvailable()) return [];
    final out = <Lang>[];
    for (final l in Langs.installed) {
      if (l == mine) continue;
      if (!await appleReady(l, mine) || !await appleReady(mine, l)) out.add(l);
    }
    return out;
  }

  /// Chiede a iOS di scaricare le lingue Apple (compare la finestra di sistema).
  Future<void> prepareApple(Lang mine, List<Lang> others) async {
    if (others.isEmpty || !await appleAvailable()) return;
    try {
      await _apple.invokeMethod<bool>('prepare', {
        'pairs': [
          for (final l in others) [appleCode(l), appleCode(mine)],
        ],
      });
    } catch (_) {}
  }

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
    if (await appleReady(from, to)) {
      try {
        final out = await _apple.invokeMethod<String>('translate', {
          'text': clean,
          'from': appleCode(from),
          'to': appleCode(to),
        });
        if (out != null && out.trim().isNotEmpty) return out;
      } catch (_) {
        // Se Apple fallisce si usa ML Kit.
      }
    }
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
