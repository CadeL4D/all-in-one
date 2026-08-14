import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Rect;

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract final class BackupService {
  static Future<File> createBackupFile() async {
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final Map<String, dynamic> data = <String, dynamic>{};

    for (final String key in preferences.getKeys()) {
      // `getStringList` casts internally, so calling it for a string value
      // throws on Android. Read the untyped value first, then preserve only
      // the preference types that can be represented in a JSON backup.
      final Object? value = preferences.get(key);
      switch (value) {
        case String():
        case bool():
        case int():
        case double():
          data[key] = value;
        case List<String>():
          data[key] = value;
      }
    }

    final Map<String, dynamic> backup = <String, dynamic>{
      'format': 'one_hub_backup',
      'version': 1,
      'exportedAt': DateTime.now().toIso8601String(),
      'data': data,
    };

    final Directory directory = await getTemporaryDirectory();
    final String stamp = DateTime.now().toIso8601String().replaceAll(':', '-');
    final File file = File('${directory.path}/one_hub_backup_$stamp.json');
    await file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(backup),
    );
    return file;
  }

  static Future<void> exportAndShare({Rect? sharePositionOrigin}) async {
    final File file = await createBackupFile();
    await SharePlus.instance.share(
      ShareParams(
        files: <XFile>[XFile(file.path)],
        sharePositionOrigin: sharePositionOrigin ?? Rect.fromLTWH(0, 0, 1, 1),
        subject: 'One Hub backup',
        text: 'One Hub backup file',
        fileNameOverrides: const <String>['one_hub_backup.json'],
      ),
    );
  }

  static Future<bool> importFromPicker() async {
    final FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['json'],
    );
    if (result == null || result.files.isEmpty) {
      return false;
    }

    final PlatformFile pickedFile = result.files.single;
    final String? path = pickedFile.path;
    if (path == null) {
      return false;
    }

    final File file = File(path);
    final Object? decoded = jsonDecode(await file.readAsString());
    if (decoded is! Map<String, dynamic> ||
        decoded['format'] != 'one_hub_backup') {
      return false;
    }

    final Object? rawData = decoded['data'];
    if (rawData is! Map<String, dynamic>) {
      return false;
    }

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    await preferences.clear();
    for (final MapEntry<String, dynamic> entry in rawData.entries) {
      final Object? value = entry.value;
      if (value is List<dynamic>) {
        await preferences.setStringList(
          entry.key,
          value.whereType<String>().toList(),
        );
      } else if (value is String) {
        await preferences.setString(entry.key, value);
      } else if (value is bool) {
        await preferences.setBool(entry.key, value);
      } else if (value is int) {
        await preferences.setInt(entry.key, value);
      } else if (value is double) {
        await preferences.setDouble(entry.key, value);
      }
    }
    await preferences.reload();
    return true;
  }
}
