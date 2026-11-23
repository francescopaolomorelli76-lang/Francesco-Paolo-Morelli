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

  /// Stato Apple di una coppia: "installed", "supported" (scaricabile),
  /// "unsupported" (Apple non la conosce). Ricordato per tutta la sessione:
  /// chiederlo a ogni traduzione rallentava.
  final Map<String, String> _appleStatus = {};

  Future<String> appleStatus(Lang from, Lang to) async {
    final key = '${from.name}>${to.name}';
    final cached = _appleStatus[key];
    if (cached != null) return cached;
    if (!await appleAvailable()) return 'unsupported';
    try {
      final s = await _apple.invokeMethod<String>('status', {'from': appleCode(from), 'to': appleCode(to)});
      return _appleStatus[key] = s ?? 'unsupported';
    } catch (_) {
      return 'unsupported';
    }
  }

  /// La coppia di lingue Apple è già scaricata sul telefono?
  Future<bool> appleReady(Lang from, Lang to) async => await appleStatus(from, to) == 'installed';

  /// Lingue (diverse dalla mia) che Apple sa tradurre ma non sono ancora
  /// scaricate. Quelle che Apple non conosce (es. albanese) non contano:
  /// per loro c'è ML Kit, e chiederle a iOS faceva solo comparire errori.
  Future<List<Lang>> appleMissing(Lang mine) async {
    if (!await appleAvailable()) return [];
    final out = <Lang>[];
    for (final l in Langs.installed) {
      if (l == mine) continue;
      final a = await appleStatus(l, mine), b = await appleStatus(mine, l);
      if (a == 'unsupported' || b == 'unsupported') continue;
      if (a != 'installed' || b != 'installed') out.add(l);
    }
    return out;
  }

  /// Chiede a iOS di scaricare le lingue Apple (compare la finestra di sistema).
  Future<void> prepareApple(Lang mine, List<Lang> others) async {
    if (others.isEmpty || !await appleAvailable()) return;
    try {
      await _apple.invokeMethod<bool>('prepare', {
        'pairs': [
          for (final l in others) ...[
            [appleCode(l), appleCode(mine)],
            [appleCode(mine), appleCode(l)],
          ],
        ],
      });
    } catch (_) {}
    _appleStatus.clear();
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
  /// Ultime traduzioni fatte: la frase finale spesso è già stata tradotta
  /// mentre si parlava, così la risposta è immediata.
  final Map<String, String> _memo = {};

  Future<String> translate(String text, Lang from, Lang to) async {
    final clean = text.trim();
    if (clean.isEmpty || from == to) return clean;
    final memoKey = '${from.name}>${to.name}>$clean';
    final hit = _memo[memoKey];
    if (hit != null) return hit;
    final out = await _translate(clean, from, to);
    if (_memo.length > 200) _memo.remove(_memo.keys.first);
    _memo[memoKey] = out;
    return out;
  }

  Future<String> _translate(String clean, Lang from, Lang to) async {
    if (await appleReady(from, to)) {
      try {
        final out = await _apple.invokeMethod<String>('translate', {
          'text': clean,
          'from': appleCode(from),
          'to': appleCode(to),
        });
        if (out != null && out.trim().isNotEmpty) return out;
      } catch (_) {
        // Se Apple fallisce si usa ML Kit (e non lo si richiede più per questa coppia).
        _appleStatus['${from.name}>${to.name}'] = 'failed';
      }
    }
    for (final l in [from, to]) {
      if (!await isDownloaded(l)) throw MissingLanguage(l);
    }
    final key = '${from.name}>${to.name}';
    final translator = _cache[key] ??= OnDeviceTranslator(sourceLanguage: from.mlkit, targetLanguage: to.mlkit);
    try {
      return await translator.translateText(clean);
    } on PlatformException catch (e) {
      if (!isBrokenModelError(e)) rethrow;
      // Il telefono crede che la lingua sia scaricata ma i file mancano o sono
      // rovinati (download interrotto, aggiornamento): si cancella il modello,
      // si riscarica e si ritraduce una volta.
      _cache.remove(key);
      await translator.close().catchError((_) {});
      await _repair(from);
      await _repair(to);
      final fresh = _cache[key] = OnDeviceTranslator(sourceLanguage: from.mlkit, targetLanguage: to.mlkit);
      return fresh.translateText(clean);
    }
  }

  /// Riscarica da zero il modello di una lingua (pulsante "Ripara le lingue").
  Future<void> repair(Lang l) async {
    _memo.clear();
    await _closeTranslatorsWith(l);
    await _repair(l);
  }

  Future<void> _closeTranslatorsWith(Lang l) async {
    final keys = _cache.keys.where((k) => k.split('>').contains(l.name)).toList();
    for (final k in keys) {
      await _cache.remove(k)?.close().catchError((_) {});
    }
  }

  /// Controllo automatico (una volta per versione, in sottofondo): prova una
  /// parola con ogni lingua ML Kit scaricata; quelle rovinate vengono
  /// cancellate e riscaricate. Restituisce le lingue riparate.
  Future<List<Lang>> selfCheck(Lang mine) async {
    final fixed = <Lang>[];
    for (final l in Langs.installed) {
      if (l == mine || !await isDownloaded(l)) continue;
      final pivot = l == Lang.en ? mine : Lang.en;
      if (!await isDownloaded(pivot)) continue;
      final t = OnDeviceTranslator(sourceLanguage: l.mlkit, targetLanguage: pivot.mlkit);
      try {
        await t.translateText('ok').timeout(const Duration(seconds: 20));
      } on PlatformException catch (e) {
        if (isBrokenModelError(e)) {
          // Non si sa quale delle due sia rovinata: si riparano entrambe (una volta).
          for (final x in [l, pivot]) {
            if (fixed.contains(x)) continue;
            try {
              await repair(x);
              fixed.add(x);
            } catch (_) {}
          }
        }
      } catch (_) {
      } finally {
        await t.close().catchError((_) {});
      }
    }
    return fixed;
  }

  /// Errore di ML Kit "Translation model files not found" (codice 13) e simili.
  static bool isBrokenModelError(PlatformException e) {
    final m = '${e.code} ${e.message}'.toLowerCase();
    return m.contains('model files not found') || m.contains('downloadmodelifneeded') || e.code == 'Error 13';
  }

  final Map<String, Future<void>> _repairing = {};

  /// Cancella e riscarica il modello di una lingua (una sola volta anche se
  /// richiesto da più traduzioni insieme). Senza internet → [MissingLanguage].
  Future<void> _repair(Lang l) => _repairing[l.name] ??= () async {
    try {
      _ready.remove(l);
      try {
        await _manager.deleteModel(l.mlkit.bcpCode);
      } catch (_) {}
      var ok = false;
      try {
        ok = await _manager.downloadModel(l.mlkit.bcpCode, isWifiRequired: false).timeout(const Duration(minutes: 3));
      } catch (_) {}
      if (!ok) throw MissingLanguage(l);
      _ready.add(l);
    } finally {
      _repairing.remove(l.name);
    }
  }();

  Future<void> dispose() async {
    for (final t in _cache.values) {
      await t.close();
    }
    _cache.clear();
  }
}
