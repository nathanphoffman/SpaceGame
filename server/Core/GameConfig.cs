namespace SpaceGame.Core;

/// <summary>Every tunable number of the game lives here (costs, times, speeds, enemy settings, score target, week length).</summary>
/// <param name="ScoreTarget">Points that win the game.</param>
/// <param name="WeekSeconds">Game length in game seconds.</param>
/// <param name="PrepSeconds">Launch and crew prep before every flight.</param>
public sealed record GameConfig(int ScoreTarget = 500, long WeekSeconds = 604_800, long PrepSeconds = 300);

/// <summary>Who plays.</summary>
public sealed record PlayerSetup(PlayerId Id, string Name);

/// <summary>Everything needed to create a game; the same setup always gives the same galaxy.</summary>
public sealed record GameSetup(int Seed, IReadOnlyList<PlayerSetup> Players, GameConfig Config);
