import 'package:all_in_one/src/apps/noises/noises_app.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  final messenger = binding.defaultBinaryMessenger;
  final calls = <MethodCall>[];
  bool failSource = false;

  setUp(() {
    calls.clear();
    failSource = false;
    SharedPreferences.setMockInitialValues(<String, Object>{});
    for (final name in <String>[
      'xyz.luan/audioplayers.global',
      'xyz.luan/audioplayers.global/events',
    ]) {
      messenger.setMockMethodCallHandler(
        MethodChannel(name),
        (_) async => null,
      );
    }
    messenger.setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers'),
      (call) async {
        calls.add(call);
        final id = (call.arguments as Map)['playerId'];
        if (call.method == 'create') {
          messenger.setMockMethodCallHandler(
            MethodChannel('xyz.luan/audioplayers/events/$id'),
            (_) async => null,
          );
        }
        if (call.method == 'setSourceBytes') {
          if (failSource) throw PlatformException(code: 'load_failed');
          await messenger.handlePlatformMessage(
            'xyz.luan/audioplayers/events/$id',
            const StandardMethodCodec().encodeSuccessEnvelope(<String, Object>{
              'event': 'audio.onPrepared',
              'value': true,
            }),
            (_) {},
          );
        }
        if (call.method == 'getDuration' ||
            call.method == 'getCurrentPosition') {
          return 16000;
        }
        return null;
      },
    );
  });

  List<MethodCall> named(String method) =>
      calls.where((call) => call.method == method).toList();

  Future<void> finishGeneration(WidgetTester tester) async {
    // compute runs on a real isolate, outside the widget test's fake clock.
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(seconds: 1)),
    );
    await tester.pump();
  }

  Future<void> start(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: NoisesApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Play white'));
    await finishGeneration(tester);
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 100));
  }

  testWidgets(
    'variations overlap, keep power, and stop cancels future changes',
    (tester) async {
      await start(tester);
      expect(find.text('Stop'), findsOneWidget);
      expect(named('resume'), hasLength(1));
      final first = named('resume').single.arguments['playerId'];
      await tester.pump(const Duration(seconds: 299));
      expect(named('setSourceBytes'), hasLength(1));
      await tester.pump(const Duration(seconds: 301));
      await finishGeneration(tester);
      expect(named('resume'), hasLength(2));
      expect(named('stop'), isEmpty);
      final second = named('resume').last.arguments['playerId'];
      expect(second, isNot(first));
      for (int i = 0; i < 80; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      final volumes = <dynamic, double>{};
      for (final call in named('setVolume')) {
        volumes[call.arguments['playerId']] =
            call.arguments['volume'] as double;
      }
      expect(volumes[first], closeTo(0.72 / 1.41421356, 0.02));
      expect(volumes[second], closeTo(0.72 / 1.41421356, 0.02));
      await tester.tap(find.text('Stop'));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Play white'), findsOneWidget);
      expect(
        named('stop').map((c) => c.arguments['playerId']),
        containsAll([first, second]),
      );
      await tester.pump(const Duration(minutes: 11));
      expect(named('resume'), hasLength(2));
      await close(tester);

      // Continue in the same audio session to exercise load failure recovery.
      calls.clear();
      await start(tester);
      final restarted = named('resume').single.arguments['playerId'];
      failSource = true;
      await tester.pump(const Duration(minutes: 10));
      await finishGeneration(tester);
      await tester.pump(const Duration(seconds: 31));
      expect(find.text('Stop'), findsOneWidget);
      expect(named('resume'), hasLength(1));
      expect(
        named('stop').where((c) => c.arguments['playerId'] == restarted),
        isEmpty,
      );
      await close(tester);

      calls.clear();
      await start(tester);
      await tester.pump(const Duration(seconds: 31));
      expect(find.text('Play white'), findsOneWidget);
      expect(find.text('Stop'), findsNothing);
      await close(tester);
    },
  );
}
