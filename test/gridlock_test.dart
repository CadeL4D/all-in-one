import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:all_in_one/src/apps/gridlock/gridlock_app.dart';
import 'package:all_in_one/src/apps/gridlock/gridlock_engine.dart';
import 'package:all_in_one/src/apps/gridlock/gridlock_models.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('Simon route starts adjacent and grows by one after a clear', () {
    final GridlockEngine engine = GridlockEngine(seed: 4)
      ..start(withDecoys: false);
    _advanceToInput(engine);

    expect(engine.path, hasLength(3));
    _expectAdjacent(engine.path);
    final List<int> firstRoute = List<int>.of(engine.path);
    for (final int tile in firstRoute) {
      expect(engine.tapTile(tile), isTrue);
    }
    expect(engine.phase, GridlockPhase.roundWon);
    expect(engine.roundsCompleted, 1);

    _advance(engine, GridlockEngine.roundWonSeconds + 0.1);
    expect(engine.path, hasLength(4));
    expect(engine.path.take(3), firstRoute);
    _expectAdjacent(engine.path);
  });

  test('the three-second clock resets after every correct tap', () {
    final GridlockEngine engine = GridlockEngine(seed: 7)
      ..start(withDecoys: false);
    _advanceToInput(engine);

    _advance(engine, 2.75);
    expect(engine.phase, GridlockPhase.input);
    expect(engine.responseRemaining, lessThan(0.3));
    engine.tapTile(engine.path.first);
    expect(engine.responseRemaining, GridlockEngine.responseSeconds);

    _advance(engine, 2.85);
    expect(engine.phase, GridlockPhase.input);
    _advance(engine, 0.2);
    expect(engine.phase, GridlockPhase.gameOver);
    expect(engine.endReason, GridlockEndReason.timeout);
  });

  test('decoys are strictly optional and never cover the real tile', () {
    final GridlockEngine memory = GridlockEngine(seed: 11)
      ..start(withDecoys: false);
    _advance(memory, GridlockEngine.readySeconds + 0.05);
    expect(memory.phase, GridlockPhase.showing);
    expect(memory.activeTile, isNotNull);
    expect(memory.decoyTile, isNull);

    final GridlockEngine decoys = GridlockEngine(seed: 11)
      ..start(withDecoys: true);
    _advance(decoys, GridlockEngine.readySeconds + 0.05);
    expect(decoys.phase, GridlockPhase.showing);
    expect(decoys.decoyTile, isNotNull);
    expect(decoys.decoyTile, isNot(decoys.activeTile));
  });

  test('a wrong Simon input ends the run immediately', () {
    final GridlockEngine engine = GridlockEngine(seed: 16)
      ..start(withDecoys: false);
    _advanceToInput(engine);
    final int wrong = List<int>.generate(
      GridlockEngine.tileCount,
      (int i) => i,
    ).firstWhere((int tile) => tile != engine.path.first);

    expect(engine.tapTile(wrong), isFalse);
    expect(engine.phase, GridlockPhase.gameOver);
    expect(engine.endReason, GridlockEndReason.wrongTile);
  });

  test('stats retain five runs and separate memory and decoy records', () {
    GridlockStats stats = const GridlockStats();
    for (int index = 1; index <= 7; index++) {
      stats = stats.record(
        GridlockRun(
          id: '$index',
          score: index * 100,
          rounds: index,
          longestPath: index + 2,
          decoys: index.isEven,
          durationSeconds: index * 4,
          playedAt: DateTime(2026, 8, 18, 12, index),
        ),
      );
    }

    expect(stats.recentRuns, hasLength(5));
    expect(stats.recentRuns.map((GridlockRun run) => run.id), <String>[
      '7',
      '6',
      '5',
      '4',
      '3',
    ]);
    expect(stats.memoryHighScore, 700);
    expect(stats.decoyHighScore, 600);
  });

  testWidgets('lobby shows both records and only five recent plays', (
    WidgetTester tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'gridlock_v1': jsonEncode(<String, dynamic>{
        'memoryHighScore': 940,
        'decoyHighScore': 1280,
        'decoysEnabled': false,
        'recentRuns': <Map<String, dynamic>>[
          for (int index = 1; index <= 6; index++)
            <String, dynamic>{
              'id': '$index',
              'score': index * 100,
              'rounds': index,
              'longestPath': index + 2,
              'decoys': index.isEven,
              'durationSeconds': index * 5,
              'playedAt': DateTime(2026, 8, 18, 12, index).toIso8601String(),
            },
        ],
      }),
    });
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: GridlockApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('0940'), findsOneWidget);
    expect(find.text('1280'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Recent plays'),
      500,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.byKey(const ValueKey<String>('gridlock-run-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('gridlock-run-5')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey<String>('gridlock-run-6')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('decoy mode is optional and the run renders all sixteen tiles', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: GridlockApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.byKey(const ValueKey<String>('gridlock-decoy-mode')));
    await tester.pump();
    expect(find.text('START WITH DECOYS'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey<String>('gridlock-start')));
    await tester.pump(const Duration(milliseconds: 50));
    for (int tile = 0; tile < GridlockEngine.tileCount; tile++) {
      expect(
        find.byKey(ValueKey<String>('gridlock-tile-$tile')),
        findsOneWidget,
      );
    }
    expect(find.text('DECOYS'), findsOneWidget);
    expect(tester.takeException(), isNull);

    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final Map<String, dynamic> saved = jsonDecode(
      preferences.getString('gridlock_v1')!,
    ) as Map<String, dynamic>;
    expect(saved['decoysEnabled'], isTrue);
  });
}

void _advanceToInput(GridlockEngine engine) {
  for (
    int index = 0;
    index < 200 && engine.phase != GridlockPhase.input;
    index++
  ) {
    engine.tick(0.05);
  }
  expect(engine.phase, GridlockPhase.input);
}

void _advance(GridlockEngine engine, double seconds) {
  double elapsed = 0;
  while (elapsed < seconds) {
    engine.tick(0.05);
    elapsed += 0.05;
  }
}

void _expectAdjacent(List<int> path) {
  for (int index = 1; index < path.length; index++) {
    expect(GridlockEngine.neighborsOf(path[index - 1]), contains(path[index]));
  }
}
