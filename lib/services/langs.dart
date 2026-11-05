import '../languages.dart';
import 'prefs.dart';

/// Lingue attive nell'app: le 6 di base più quelle scaricate dalla
/// schermata 🌍 Lingue del mondo.
class Langs {
  static const _key = 'extra_langs';

  static List<Lang> get extras => [
    for (final code in Prefs.list(_key))
      if (Lang.fromCode(code) case final l? when !Lang.values.contains(l)) l,
  ];

  static List<Lang> get installed => [...Lang.values, ...extras];

  static bool isInstalled(Lang l) => installed.contains(l);

  static Future<void> add(Lang l) async {
    if (isInstalled(l)) return;
    await Prefs.setList(_key, [...Prefs.list(_key), l.name]);
  }

  static Future<void> remove(Lang l) => Prefs.setList(_key, Prefs.list(_key).where((c) => c != l.name).toList());
}
