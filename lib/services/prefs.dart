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

  static String str(String key, [String fallback = '']) => _p.getString(key) ?? fallback;
  static Future<void> setStr(String key, String v) => _p.setString(key, v);

  static List<String> list(String key) => _p.getStringList(key) ?? const [];
  static Future<void> setList(String key, List<String> v) => _p.setStringList(key, v);

  static double number(String key, double fallback) => _p.getDouble(key) ?? fallback;
  static Future<void> setNumber(String key, double v) => _p.setDouble(key, v);

  /// Lingua opzionale (null = non ancora nota / automatica).
  static Lang? maybe(String key) {
    final n = _p.getString(key);
    return n == null ? null : Lang.fromName(n, Lang.en);
  }

  static Future<void> setMaybe(String key, Lang? lang) => lang == null ? _p.remove(key) : _p.setString(key, lang.name);
}
