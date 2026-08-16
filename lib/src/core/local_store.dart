import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

abstract final class LocalStore {
  static const String tasksKey = 'tasks_v1';
  static const String routinesKey = 'routines_v1';
  static const String promptsKey = 'prompts_v1';
  static const String recentAppsKey = 'recent_apps_v1';
  static const String appOrderKey = 'app_order_v1';
  static const String parkingBestKey = 'parking_best_v1';

  static Future<String?> readString(String key) async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    return preferences.getString(key);
  }

  static Future<void> writeString(String key, String value) async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    await preferences.setString(key, value);
  }

  static Future<List<String>> readStringList(String key) async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    return preferences.getStringList(key) ?? const <String>[];
  }

  static Future<void> writeStringList(String key, List<String> value) async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    await preferences.setStringList(key, value);
  }

  static Future<List<Map<String, dynamic>>?> readJsonList(String key) async {
    final String? raw = await readString(key);
    if (raw == null) {
      return null;
    }

    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is! List) {
        return null;
      }

      return decoded.whereType<Map<String, dynamic>>().toList(growable: false);
    } on FormatException {
      return null;
    }
  }

  static Future<void> writeJsonList(
    String key,
    List<Map<String, dynamic>> value,
  ) async {
    await writeString(key, jsonEncode(value));
  }
}
