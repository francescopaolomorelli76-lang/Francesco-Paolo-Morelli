import 'package:flutter/material.dart';

import '../ui/manga.dart';

/// Versione mostrata nella pagina Info (allineata a pubspec.yaml).
const kAppVersion = '1.0.0 (13)';

/// Pagina INFO: cos'è l'app, versione, crediti e diritti riservati.
class InfoScreen extends StatelessWidget {
  const InfoScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: MC.paper,
    appBar: AppBar(
      backgroundColor: MC.black,
      foregroundColor: MC.yellow,
      title: const OutlinedTitle('INFO', size: 28, stroke: 4),
    ),
    body: HalftoneBackground(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(26),
              child: Image.asset('assets/icon/icon.png', width: 112, height: 112),
            ),
          ),
          const SizedBox(height: 12),
          const Center(child: OutlinedTitle('MANGA VOX', size: 40)),
          const SizedBox(height: 4),
          Center(
            child: Text(
              'Versione $kAppVersion',
              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xAA111111)),
            ),
          ),
          const SizedBox(height: 18),
          const ComicPanel(
            child: Text(
              'Il traduttore simultaneo in stile fumetto: tieni premuto, parla, lascia. '
              'Riconosce da solo la lingua di chi hai davanti, traduce anche offline e '
              'legge la traduzione ad alta voce. Con lo scanner traduci menù e cartelli.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, height: 1.4),
            ),
          ),
          const SizedBox(height: 26),

          // ── Crediti
          Container(
            padding: const EdgeInsets.fromLTRB(18, 22, 18, 20),
            decoration: BoxDecoration(
              color: const Color(0xFF0B0B0B),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFD6AA5A), width: 2),
              boxShadow: const [BoxShadow(color: MC.black, offset: Offset(6, 6))],
            ),
            child: Column(
              children: [
                Image.asset('assets/brand/fpm_medal.png', width: 120, height: 120),
                const SizedBox(height: 12),
                const Text(
                  'Progettata e realizzata da',
                  style: TextStyle(color: Color(0xFFBFA36A), fontSize: 14, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                const Text(
                  'FPM web designer',
                  style: TextStyle(
                    color: Color(0xFFE9C77B),
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 14),
                const Divider(color: Color(0x66D6AA5A), height: 1),
                const SizedBox(height: 14),
                const Text(
                  '© 2026 FPM web designer\nTutti i diritti riservati.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFFE9C77B), fontSize: 15, fontWeight: FontWeight.w800, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Center(
            child: ComicButton(
              label: 'LICENZE OPEN SOURCE',
              color: MC.white,
              size: 16,
              onTap: () => showLicensePage(
                context: context,
                applicationName: 'Manga Vox',
                applicationVersion: kAppVersion,
                applicationLegalese: '© 2026 FPM web designer. Tutti i diritti riservati.',
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Manga Vox usa componenti open source (tra cui Flutter, Google ML Kit, whisper.cpp, Tesseract) '
            'e il font Bangers (SIL Open Font License), ciascuno con la propria licenza.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: Color(0xAA111111), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    ),
  );
}

/// Piccolo medaglione FPM, discreto, da appoggiare nella grafica delle pagine.
/// Toccandolo si apre la pagina Info.
class FpmBadge extends StatelessWidget {
  const FpmBadge({super.key, this.size = 34});
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: 'Info e crediti: FPM web designer',
    child: GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InfoScreen())),
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Color(0x55000000), blurRadius: 4, offset: Offset(1, 2))],
        ),
        child: Image.asset('assets/brand/fpm_medal.png', width: size, height: size),
      ),
    ),
  );
}
