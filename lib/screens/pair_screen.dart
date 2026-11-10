import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/peer_link.dart';
import '../ui/manga.dart';

/// 🔗 COLLEGA UN AMICO: due iPhone con Manga Vox si trovano e si collegano
/// senza internet. Poi ognuno parla nelle sue cuffie col pulsante IO.
class PairScreen extends StatefulWidget {
  const PairScreen({super.key, required this.mine});
  final Lang mine;

  @override
  State<PairScreen> createState() => _PairScreenState();
}

class _PairScreenState extends State<PairScreen> {
  final _link = PeerLink.instance;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _link.connected.addListener(_onConnected);
    _link.startDiscovery(widget.mine).then((ok) {
      if (mounted) setState(() => _started = ok);
    });
  }

  void _onConnected() {
    if (_link.connected.value != null && mounted) {
      comicToast(context, 'Collegati! 🔗 Ora parlate ognuno col suo pulsante IO.');
      Navigator.pop(context, true);
    }
  }

  @override
  void dispose() {
    _link.connected.removeListener(_onConnected);
    _link.stopDiscovery();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: MC.paper,
    appBar: AppBar(
      backgroundColor: MC.black,
      foregroundColor: MC.yellow,
      title: const OutlinedTitle('COLLEGA UN AMICO', size: 26, stroke: 4),
    ),
    body: HalftoneBackground(
      speedLines: true,
      focus: const Alignment(0, -0.6),
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          ComicPanel(
            color: MC.yellow,
            child: Column(
              children: [
                const Text('IL TUO CODICE', style: TextStyle(fontWeight: FontWeight.w900)),
                Text(_link.myCode, style: comic(64)),
                Text(
                  'Anche il tuo amico apre questa schermata su Manga Vox. Quando compare il suo codice qui sotto, toccalo.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text('TELEFONI VICINI', style: comic(24)),
          const SizedBox(height: 8),
          ValueListenableBuilder<List<Peer>>(
            valueListenable: _link.nearby,
            builder: (_, peers, _) {
              final list = peers.where((p) => p.state != 'disconnected').toList();
              if (!PeerLink.supported) {
                return const ComicPanel(
                  child: Text(
                    'Per ora il collegamento funziona tra due iPhone. Android arriverà con un aggiornamento.',
                  ),
                );
              }
              if (list.isEmpty) {
                return ComicPanel(
                  child: Row(
                    children: [
                      const SizedBox.square(
                        dimension: 24,
                        child: CircularProgressIndicator(strokeWidth: 3, color: MC.black),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          _started
                              ? 'Cerco altri Manga Vox qui vicino… Tenete i telefoni a pochi metri, con Bluetooth e Wi-Fi accesi.'
                              : 'Avvio la ricerca…',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                );
              }
              return Column(
                children: [
                  for (final p in list)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: GestureDetector(
                        onTap: p.state == 'found' ? () => _link.invite(p) : null,
                        child: ComicPanel(
                          color: p.state == 'connected' ? const Color(0xFFE6F7E9) : MC.white,
                          child: Row(
                            children: [
                              Text(p.flag, style: const TextStyle(fontSize: 30)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Codice ${p.code}',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                                ),
                              ),
                              if (p.state == 'connecting')
                                const SizedBox.square(
                                  dimension: 24,
                                  child: CircularProgressIndicator(strokeWidth: 3, color: MC.black),
                                )
                              else if (p.state == 'connected')
                                const Icon(Icons.check_circle, color: Color(0xFF2A9D3F), size: 30)
                              else
                                ComicButton(label: 'COLLEGA', size: 16, onTap: () => _link.invite(p)),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 14),
          const Text(
            'Funziona anche senza internet (Bluetooth e Wi-Fi diretto). Al primo uso l\'iPhone chiede il permesso '
            'di cercare dispositivi sulla rete locale: tocca "Consenti".',
            style: TextStyle(fontSize: 13, color: Color(0xAA111111), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    ),
  );
}
