import 'package:shared_preferences/shared_preferences.dart';

import '../languages.dart';

/// Ricorda le ultime lingue scelte.
class Prefs {
  static late SharedPreferences _p;
  static Future<void> init() async => _p = await SharedPreferences.getInstance();

  static Lang get(String key, Lang fallback) => Lang.fromName(_p.getString(key), fallback);
  static Future<void> set(String key, Lang lang) => _p.setString(key, lang.name);

  static bool flag(String key, {bool fallback = false}) => _p.getBool(key) ?? fallback;
  static Future<void> setFlag(String key, bool v) => _p.setBool(key, v);
}
