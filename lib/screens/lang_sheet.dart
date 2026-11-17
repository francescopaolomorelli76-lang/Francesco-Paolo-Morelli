import 'package:flutter/material.dart';

import '../languages.dart';
import '../services/langs.dart';
import '../ui/manga.dart';
import 'setup_screen.dart';
import 'world_screen.dart';

/// Risultato "lingua automatica" del selettore.
const kAutoLanguage = 'auto';

/// Selettore di lingua a tutto schermo che si scorre: tutte le lingue già
/// scaricate in ordine alfabetico, più i pulsanti RIPARA LE LINGUE e
/// ALTRE LINGUE DEL MONDO. Restituisce una [Lang], [kAutoLanguage] o null.
Future<Object?> showLanguageSheet(
  BuildContext context, {
  required String title,
  Lang? current,
  Lang? exclude,
  bool allowAuto = false,
}) async {
  final result = await showModalBottomSheet<Object>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _LanguageSheet(title: title, current: current, exclude: exclude, allowAuto: allowAuto),
  );
  if (!context.mounted) return null;
  if (result == 'repair') {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const SetupScreen(autoRepair: true)));
    return null;
  }
  if (result == 'world') {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const WorldScreen()));
    return null;
  }
  return result;
}

class _LanguageSheet extends StatelessWidget {
  const _LanguageSheet({required this.title, this.current, this.exclude, required this.allowAuto});
  final String title;
  final Lang? current;
  final Lang? exclude;
  final bool allowAuto;

  @override
  Widget build(BuildContext context) {
    final langs = Langs.installed.where((l) => l != exclude).toList()
      ..sort((a, b) => a.itName.toLowerCase().compareTo(b.itName.toLowerCase()));
    return DraggableScrollableSheet(
      initialChildSize: 0.82,
      minChildSize: 0.5,
      maxChildSize: 0.94,
      expand: false,
      builder: (ctx, scroll) => Padding(
        padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
        child: ComicPanel(
          color: MC.paper,
          padding: EdgeInsets.zero,
          child: SafeArea(
            top: false,
            child: CustomScrollView(
              controller: scroll,
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                    child: Column(
                      children: [
                        Container(
                          width: 48,
                          height: 5,
                          decoration: BoxDecoration(color: MC.black, borderRadius: BorderRadius.circular(4)),
                        ),
                        const SizedBox(height: 10),
                        OutlinedTitle(title, size: 28),
                        const SizedBox(height: 10),
                        if (allowAuto) ...[
                          GestureDetector(
                            onTap: () => Navigator.pop(ctx, kAutoLanguage),
                            child: ComicPanel(
                              color: current == null ? MC.cyan : MC.white,
                              shadow: 3,
                              child: const Row(
                                children: [
                                  Icon(Icons.auto_awesome, size: 26),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'AUTOMATICA: la riconosco io',
                                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: ComicButton(
                                label: '🔧 RIPARA',
                                size: 16,
                                color: MC.white,
                                onTap: () => Navigator.pop(ctx, 'repair'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ComicButton(
                                label: '🌍 ALTRE LINGUE',
                                size: 16,
                                color: MC.yellow,
                                onTap: () => Navigator.pop(ctx, 'world'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text('LINGUE SCARICATE (${langs.length})', style: comic(18)),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    childAspectRatio: 2.4,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    children: [
                      for (final l in langs)
                        GestureDetector(
                          onTap: () => Navigator.pop(ctx, l),
                          child: ComicPanel(
                            color: l == current ? MC.yellow : MC.white,
                            shadow: 3,
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            child: Row(
                              children: [
                                Text(l.flag, style: const TextStyle(fontSize: 24)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l.label,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                                      ),
                                      Text(
                                        l.itName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 12, color: Color(0xAA111111)),
                                      ),
                                    ],
                                  ),
                                ),
                                if (l == current) const Icon(Icons.check_circle, size: 20, color: MC.black),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
