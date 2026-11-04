import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/setup_service.dart';
import '../ui/manga.dart';

/// Preparazione offline: un solo pulsante scarica voce + lingue.
class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  SetupStatus? _status;
  bool _running = false;
  double _progress = 0;
  String _step = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final s = await SetupService.status();
    if (mounted) setState(() => _status = s);
  }

  Future<void> _go() async {
    setState(() {
      _running = true;
      _error = null;
    });
    try {
      await SetupService.downloadAll((step, p) {
        if (mounted) {
          setState(() {
            _step = step;
            _progress = p;
          });
        }
      });
      await _refresh();
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = 'Download interrotto. Controlla la connessione e riprova.');
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _status;
    return Scaffold(
      backgroundColor: MC.paper,
      body: HalftoneBackground(
        speedLines: true,
        focus: const Alignment(0, -0.6),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  const Spacer(),
                  IconButton(
                    tooltip: 'Chiudi',
                    onPressed: _running ? null : () => Navigator.pop(context, false),
                    icon: const Icon(Icons.close, size: 30, color: MC.black),
                  ),
                ],
              ),
              const Center(child: OutlinedTitle('PRONTI AL VIA?', size: 44)),
              const SizedBox(height: 16),
              const ComicPanel(
                color: MC.yellow,
                child: Text(
                  'Scarico UNA VOLTA la voce offline e le 6 lingue (circa 330 MB, meglio col Wi-Fi). '
                  'Dopo, Manga Vox funziona anche senza internet.',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 18),
              ComicPanel(
                child: Column(
                  children: [
                    _item('🎤', 'Voce offline (riconosce la lingua)', s?.voiceReady),
                    for (final l in Lang.values) _item(l.flag, l.label, s == null ? null : !s.missingLangs.contains(l)),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              if (_running) ...[
                Text(_step, textAlign: TextAlign.center, style: comic(26)),
                const SizedBox(height: 10),
                ComicPanel(
                  padding: EdgeInsets.zero,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: LinearProgressIndicator(
                      value: _progress,
                      minHeight: 26,
                      backgroundColor: MC.white,
                      color: MC.red,
                    ),
                  ),
                ),
              ] else if (s != null && s.complete)
                Center(
                  child: ComicButton(
                    label: 'TUTTO PRONTO!',
                    icon: Icons.check,
                    onTap: () => Navigator.pop(context, true),
                  ),
                )
              else
                Center(
                  child: ComicButton(
                    label: 'SCARICA TUTTO',
                    icon: Icons.download,
                    color: MC.red,
                    textColor: MC.white,
                    size: 30,
                    onTap: s == null ? null : _go,
                  ),
                ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                ComicPanel(
                  color: MC.red,
                  child: Text(
                    _error!,
                    style: const TextStyle(color: MC.white, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(String icon, String label, bool? ok) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Text(icon, style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        ),
        if (ok == null)
          const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 3, color: MC.black))
        else
          Icon(
            ok ? Icons.check_circle : Icons.radio_button_unchecked,
            color: ok ? const Color(0xFF2A9D3F) : const Color(0x55111111),
            size: 26,
          ),
      ],
    ),
  );
}
