import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/translator_service.dart';
import '../ui/manga.dart';

/// Gestione dei pacchetti lingua offline (modelli ML Kit).
class LanguagesScreen extends StatefulWidget {
  const LanguagesScreen({super.key});

  @override
  State<LanguagesScreen> createState() => _LanguagesScreenState();
}

enum _St { checking, missing, downloading, ready, error }

class _LanguagesScreenState extends State<LanguagesScreen> {
  final _tr = TranslatorService.instance;
  final Map<Lang, _St> _st = {for (final l in Lang.values) l: _St.checking};

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    for (final l in Lang.values) {
      bool ok = false;
      try {
        ok = await _tr.isDownloaded(l);
      } catch (_) {}
      if (!mounted) return;
      setState(() => _st[l] = ok ? _St.ready : _St.missing);
    }
  }

  Future<void> _download(Lang l) async {
    setState(() => _st[l] = _St.downloading);
    bool ok = false;
    try {
      ok = await _tr.download(l);
    } catch (_) {}
    if (!mounted) return;
    setState(() => _st[l] = ok ? _St.ready : _St.error);
    if (!ok) comicToast(context, 'Download di ${l.label} non riuscito. Sei connesso a internet?', color: MC.red);
  }

  Future<void> _downloadAll() async {
    for (final l in Lang.values) {
      if (_st[l] == _St.missing || _st[l] == _St.error) await _download(l);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allReady = _st.values.every((s) => s == _St.ready);
    return Scaffold(
      backgroundColor: MC.paper,
      appBar: AppBar(
        backgroundColor: MC.black,
        foregroundColor: MC.yellow,
        title: const OutlinedTitle('LINGUE OFFLINE', size: 26, stroke: 4),
      ),
      body: HalftoneBackground(
        speedLines: true,
        focus: const Alignment(0, -1),
        child: ListView(padding: const EdgeInsets.all(16), children: [
          ComicPanel(
            color: MC.yellow,
            child: Text(
              allReady
                  ? 'TUTTO PRONTO! Ora puoi tradurre senza internet. 💥'
                  : 'Scarica le lingue UNA VOLTA sola (≈30 MB ciascuna, meglio col Wi-Fi). '
                      'Dopo, traduzione e scanner funzionano anche in aereo!',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(height: 18),
          for (final l in Lang.values) ...[
            ComicPanel(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                Text(l.flag, style: const TextStyle(fontSize: 30)),
                const SizedBox(width: 12),
                Expanded(child: Text(l.label, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
                _trailing(l),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          if (!allReady)
            Center(
              child: BurstButton(
                label: 'TUTTE!',
                icon: Icons.download,
                size: 150,
                onTap: _st.values.contains(_St.downloading) ? null : _downloadAll,
              ),
            ),
          const SizedBox(height: 12),
          const Text(
            'Suggerimento: per la voce senza rete installa anche i pacchetti di "riconoscimento vocale offline" '
            'e le voci di sintesi del telefono (Impostazioni › Lingua/Accessibilità).',
            style: TextStyle(fontSize: 13, color: Color(0xAA111111)),
          ),
        ]),
      ),
    );
  }

  Widget _trailing(Lang l) => switch (_st[l]!) {
        _St.checking || _St.downloading => const SizedBox.square(
            dimension: 28, child: CircularProgressIndicator(strokeWidth: 4, color: MC.black)),
        _St.ready => GestureDetector(
            onLongPress: () async {
              await _tr.delete(l);
              _refresh();
            },
            child: const Icon(Icons.check_circle, color: Color(0xFF2A9D3F), size: 34),
          ),
        _St.missing || _St.error => ComicButton(
            label: _st[l] == _St.error ? 'RIPROVA' : 'SCARICA',
            size: 16,
            color: _st[l] == _St.error ? MC.red : MC.yellow,
            onTap: () => _download(l),
          ),
      };
}
