import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../languages.dart';
import '../services/ocr_service.dart';
import '../services/translator_service.dart';
import '../services/voice_service.dart';
import '../ui/manga.dart';

/// Traduzione completa di una foto, blocco per blocco.
class ScanResultScreen extends StatefulWidget {
  const ScanResultScreen({super.key, required this.imagePath, required this.from, required this.to});
  final String imagePath;
  final Lang from;
  final Lang to;

  @override
  State<ScanResultScreen> createState() => _ScanResultScreenState();
}

class _ScanResultScreenState extends State<ScanResultScreen> {
  List<(String, String)>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _run();
  }

  @override
  void dispose() {
    VoiceService.instance.stopSpeaking();
    super.dispose();
  }

  Future<void> _run() async {
    try {
      final blocks = await OcrService.instance.readFile(widget.imagePath, widget.from);
      final out = <(String, String)>[];
      for (final b in blocks) {
        out.add((b, await TranslatorService.instance.translate(b, widget.from, widget.to)));
      }
      if (mounted) setState(() => _items = out);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = _items;
    return Scaffold(
      backgroundColor: MC.paper,
      appBar: AppBar(
        backgroundColor: MC.black,
        foregroundColor: MC.yellow,
        title: OutlinedTitle('${widget.from.short} ➜ ${widget.to.short}', size: 26, stroke: 4),
        actions: [
          if (items != null && items.isNotEmpty)
            IconButton(
              tooltip: 'Copia tutto',
              icon: const Icon(Icons.copy_all),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: items.map((e) => e.$2).join('\n\n')));
                comicToast(context, 'Copiato! ✂️');
              },
            ),
        ],
      ),
      body: HalftoneBackground(
        speedLines: items == null,
        child: ListView(padding: const EdgeInsets.all(14), children: [
          ComicPanel(
            padding: EdgeInsets.zero,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Image.file(File(widget.imagePath), height: 220, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 18),
          if (_error != null)
            ComicPanel(color: MC.red, child: Text('Errore: $_error', style: const TextStyle(color: MC.white)))
          else if (items == null)
            Center(child: Column(children: [
              const BurstButton(label: 'LEGGO...', icon: Icons.auto_awesome, onTap: null, busy: true, size: 140),
              const SizedBox(height: 8),
              Text('Leggo e traduco…', style: comic(24)),
            ]))
          else if (items.isEmpty)
            ComicPanel(
              color: MC.yellow,
              child: Text('Nessun testo trovato. Avvicinati e tieni fermo il telefono!', style: comic(22)),
            )
          else
            for (var i = 0; i < items.length; i++) ...[
              SpeechBubble(
                color: i.isEven ? MC.white : MC.yellow,
                tailLeft: i.isEven,
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      SelectableText(items[i].$2,
                          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: MC.black)),
                      const SizedBox(height: 4),
                      SelectableText(items[i].$1,
                          style: const TextStyle(
                              fontSize: 13, fontStyle: FontStyle.italic, color: Color(0x99111111))),
                    ]),
                  ),
                  IconButton(
                    tooltip: 'Leggi ad alta voce',
                    icon: const Icon(Icons.volume_up, color: MC.black),
                    onPressed: () => VoiceService.instance.speak(items[i].$2, widget.to),
                  ),
                ]),
              ),
              const SizedBox(height: 10),
            ],
        ]),
      ),
    );
  }
}
