namespace SpaceGame.Core;

/// <summary>Every tunable number of the game lives here (costs, times, speeds, enemy settings, score target, week length).</summary>
/// <param name="ScoreTarget">Points that win the game.</param>
/// <param name="WeekSeconds">Game length in game seconds.</param>
/// <param name="PrepSeconds">Launch and crew prep before every flight.</param>
public sealed record GameConfig(
    int ScoreTarget = GameConfig.DefaultScoreTarget,
    long WeekSeconds = GameConfig.SecondsPerWeek,
    long PrepSeconds = GameConfig.DefaultPrepSeconds)
{
    private const int DefaultScoreTarget = 500;
    private const long SecondsPerWeek = GameSeconds.Week;
    private const long DefaultPrepSeconds = 5 * 60;

    /// <summary>Every ship and building.</summary>
    public Catalog Catalog { get; init; } = Catalog.Default;

    /// <summary>Seconds a shipyard needs to repair a stack of damaged ships completely.</summary>
    public long HealSeconds { get; init; } = GameSeconds.Hour;

    /// <summary>The enemy's income, garrison and expedition numbers.</summary>
    public EnemyConfig Enemy { get; init; } = new();

    /// <summary>Flight time constants.</summary>
    public TravelConfig Travel { get; init; } = new();
}

/// <summary>Who plays.</summary>
public sealed record PlayerSetup(PlayerId Id, string Name);

/// <summary>Everything needed to create a game; the same setup always gives the same galaxy.</summary>
public sealed record GameSetup(int Seed, IReadOnlyList<PlayerSetup> Players, GameConfig Config);
