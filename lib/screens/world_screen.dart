import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/langs.dart';
import '../services/prefs.dart';
import '../services/translator_service.dart';
import '../ui/manga.dart';

/// 🌍 LINGUE DEL MONDO: tocca un paese, l'app sceglie la sua lingua e la
/// scarica per l'uso offline. Le lingue scaricate compaiono nei pulsanti,
/// nel riconoscimento automatico e nello scanner.
class WorldScreen extends StatefulWidget {
  const WorldScreen({super.key});

  @override
  State<WorldScreen> createState() => _WorldScreenState();
}

class _WorldScreenState extends State<WorldScreen> {
  final _tr = TranslatorService.instance;
  final _search = TextEditingController();
  final Set<String> _downloading = {};
  Set<String> _ready = {};

  @override
  void initState() {
    super.initState();
    _refresh();
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    final ready = <String>{};
    for (final l in Langs.installed) {
      try {
        if (await _tr.isDownloaded(l)) ready.add(l.name);
      } catch (_) {}
    }
    if (mounted) setState(() => _ready = ready);
  }

  Future<void> _download(Country c) async {
    final l = c.language;
    if (_downloading.contains(l.name)) return;
    if (_ready.contains(l.name) && Langs.isInstalled(l)) {
      comicToast(context, '${l.flag} ${l.itName} è già pronta offline ✅');
      return;
    }
    setState(() => _downloading.add(l.name));
    var ok = false;
    for (var attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        ok = await _tr.download(l).timeout(const Duration(minutes: 4)) || await _tr.isDownloaded(l);
      } catch (_) {}
    }
    if (ok) {
      await Langs.add(l);
      // iPhone: anche il traduttore Apple (qualità migliore), se disponibile.
      await _tr.prepareApple(Prefs.get('mine', Lang.deviceDefault()), [l]);
    }
    if (!mounted) return;
    setState(() {
      _downloading.remove(l.name);
      if (ok) _ready.add(l.name);
    });
    comicToast(
      context,
      ok
          ? '${c.flag} ${l.itName} scaricata! Ora la riconosco e la traduco anche offline.'
          : 'Download di ${l.itName} non riuscito: controlla internet e riprova.',
      color: ok ? MC.yellow : MC.red,
    );
  }

  Future<void> _remove(Lang l) async {
    if (Lang.values.contains(l)) return; // le 6 di base restano
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Rimuovere ${l.itName}?'),
        content: const Text('Libera spazio sul telefono. Potrai riscaricarla quando vuoi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('NO')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('RIMUOVI')),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await _tr.delete(l);
    } catch (_) {}
    await Langs.remove(l);
    if (mounted) setState(() => _ready.remove(l.name));
  }

  @override
  Widget build(BuildContext context) {
    final q = _search.text.trim().toLowerCase();
    final countries = Country.all
        .where(
          (c) =>
              q.isEmpty ||
              c.it.toLowerCase().contains(q) ||
              c.language.itName.toLowerCase().contains(q) ||
              c.language.label.toLowerCase().contains(q),
        )
        .toList();
    return Scaffold(
      backgroundColor: MC.paper,
      appBar: AppBar(
        backgroundColor: MC.black,
        foregroundColor: MC.yellow,
        title: const OutlinedTitle('LINGUE DEL MONDO', size: 26, stroke: 4),
      ),
      body: HalftoneBackground(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
              child: ComicPanel(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                shadow: 3,
                child: TextField(
                  controller: _search,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    icon: Icon(Icons.search, color: MC.black),
                    hintText: 'Cerca un paese o una lingua…',
                  ),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Tocca un paese: scarico la sua lingua (circa 30 MB, una volta sola) e funziona offline. '
                'Tieni premuto una lingua scaricata per rimuoverla.',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 20),
                itemCount: countries.length,
                itemBuilder: (_, i) {
                  final c = countries[i];
                  final l = c.language;
                  final ready = _ready.contains(l.name) && Langs.isInstalled(l);
                  final busy = _downloading.contains(l.name);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GestureDetector(
                      onTap: () => _download(c),
                      onLongPress: ready ? () => _remove(l) : null,
                      child: ComicPanel(
                        color: ready ? const Color(0xFFE6F7E9) : MC.white,
                        shadow: 3,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          children: [
                            Text(c.flag, style: const TextStyle(fontSize: 30)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.it, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                                  Text(
                                    '${l.itName} · ${l.label}',
                                    style: const TextStyle(fontSize: 14, color: Color(0xAA111111)),
                                  ),
                                ],
                              ),
                            ),
                            if (busy)
                              const SizedBox.square(
                                dimension: 26,
                                child: CircularProgressIndicator(strokeWidth: 3, color: MC.black),
                              )
                            else if (ready)
                              const Icon(Icons.check_circle, color: Color(0xFF2A9D3F), size: 30)
                            else
                              const Icon(Icons.download, color: MC.black, size: 28),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
