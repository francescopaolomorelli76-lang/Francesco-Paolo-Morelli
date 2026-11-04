import 'package:flutter/material.dart';

import '../languages.dart';
import '../ui/manga.dart';

/// Primo avvio: "Che lingua parli?". È la lingua in cui l'app traduce
/// sempre, sia la voce sia i testi inquadrati. Si cambia poi in basso.
class LanguageScreen extends StatefulWidget {
  const LanguageScreen({super.key, required this.initial});
  final Lang initial;

  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  late Lang _sel = widget.initial;

  static const _question = {
    Lang.it: 'CHE LINGUA PARLI?',
    Lang.en: 'WHAT LANGUAGE DO YOU SPEAK?',
    Lang.de: 'WELCHE SPRACHE SPRICHST DU?',
    Lang.fr: 'QUELLE LANGUE PARLES-TU ?',
    Lang.ru: 'НА КАКОМ ЯЗЫКЕ ВЫ ГОВОРИТЕ?',
    Lang.zh: '你说什么语言？',
  };
  static const _ok = {
    Lang.it: 'VIA!',
    Lang.en: 'GO!',
    Lang.de: 'LOS!',
    Lang.fr: 'GO !',
    Lang.ru: 'ВПЕРЁД!',
    Lang.zh: '开始！',
  };

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: MC.paper,
    body: HalftoneBackground(
      speedLines: true,
      focus: const Alignment(0, -0.7),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 16),
              const OutlinedTitle('MANGA VOX', size: 48),
              const SizedBox(height: 18),
              SpeechBubble(
                child: Text(
                  _question[_sel]!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: [
                    for (final l in Lang.values)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: GestureDetector(
                          onTap: () => setState(() => _sel = l),
                          child: ComicPanel(
                            color: l == _sel ? MC.yellow : MC.white,
                            shadow: l == _sel ? 6 : 3,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Text(l.flag, style: const TextStyle(fontSize: 30)),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Text(
                                    l.label,
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                                  ),
                                ),
                                if (l == _sel) const Icon(Icons.check_circle, size: 30, color: MC.black),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ComicButton(
                label: _ok[_sel]!,
                icon: Icons.arrow_forward,
                color: MC.red,
                textColor: MC.white,
                size: 32,
                onTap: () => Navigator.pop(context, _sel),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    ),
  );
}
