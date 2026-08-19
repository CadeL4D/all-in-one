class GridlockRun {
  const GridlockRun({
    required this.id,
    required this.score,
    required this.rounds,
    required this.longestPath,
    required this.decoys,
    required this.durationSeconds,
    required this.playedAt,
  });

  final String id;
  final int score;
  final int rounds;
  final int longestPath;
  final bool decoys;
  final int durationSeconds;
  final DateTime playedAt;

  factory GridlockRun.fromJson(Map<String, dynamic> json) {
    return GridlockRun(
      id: json['id'] as String? ?? '',
      score: (json['score'] as num?)?.toInt() ?? 0,
      rounds: (json['rounds'] as num?)?.toInt() ?? 0,
      longestPath: (json['longestPath'] as num?)?.toInt() ?? 0,
      decoys: json['decoys'] as bool? ?? false,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      playedAt:
          DateTime.tryParse(json['playedAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'score': score,
    'rounds': rounds,
    'longestPath': longestPath,
    'decoys': decoys,
    'durationSeconds': durationSeconds,
    'playedAt': playedAt.toIso8601String(),
  };
}

class GridlockStats {
  const GridlockStats({
    this.memoryHighScore = 0,
    this.decoyHighScore = 0,
    this.decoysEnabled = false,
    this.recentRuns = const <GridlockRun>[],
  });

  final int memoryHighScore;
  final int decoyHighScore;
  final bool decoysEnabled;
  final List<GridlockRun> recentRuns;

  int highScoreFor(bool decoys) => decoys ? decoyHighScore : memoryHighScore;

  GridlockStats record(GridlockRun run) {
    return GridlockStats(
      memoryHighScore: run.decoys
          ? memoryHighScore
          : run.score > memoryHighScore
          ? run.score
          : memoryHighScore,
      decoyHighScore: run.decoys
          ? run.score > decoyHighScore
                ? run.score
                : decoyHighScore
          : decoyHighScore,
      decoysEnabled: decoysEnabled,
      recentRuns: <GridlockRun>[run, ...recentRuns].take(5).toList(),
    );
  }

  GridlockStats withDecoys(bool value) => GridlockStats(
    memoryHighScore: memoryHighScore,
    decoyHighScore: decoyHighScore,
    decoysEnabled: value,
    recentRuns: recentRuns,
  );

  factory GridlockStats.fromJson(Map<String, dynamic> json) {
    final Object? rawRuns = json['recentRuns'];
    final List<GridlockRun> runs = rawRuns is List
        ? rawRuns
              .whereType<Map>()
              .map(
                (Map<dynamic, dynamic> raw) => GridlockRun.fromJson(
                  raw.map(
                    (dynamic key, dynamic value) =>
                        MapEntry<String, dynamic>(key.toString(), value),
                  ),
                ),
              )
              .take(5)
              .toList()
        : <GridlockRun>[];
    return GridlockStats(
      memoryHighScore: (json['memoryHighScore'] as num?)?.toInt() ?? 0,
      decoyHighScore: (json['decoyHighScore'] as num?)?.toInt() ?? 0,
      decoysEnabled: json['decoysEnabled'] as bool? ?? false,
      recentRuns: runs,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'memoryHighScore': memoryHighScore,
    'decoyHighScore': decoyHighScore,
    'decoysEnabled': decoysEnabled,
    'recentRuns': recentRuns.map((GridlockRun run) => run.toJson()).toList(),
  };
}
