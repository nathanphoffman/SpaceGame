namespace SpaceGame.Core;

/// <summary>
/// The whole game: galaxy, planets, holdings, fleets, queues, stockpiles, upgrades, enemy memory, scores, outcome.
/// Everything inside must round-trip through System.Text.Json (the server stores it as JSONB).
/// </summary>
/// <param name="Time">Game seconds since the start that this state is advanced to.</param>
public sealed record GameState(GameConfig Config, long Time)
{
    /// <summary>Planet compositions.</summary>
    public IReadOnlyList<PlanetData> Planets { get; init; } = [];

    /// <summary>The enemy's home world.</summary>
    public PlanetId? EnemyHome { get; init; }

    /// <summary>Planets the enemy owns.</summary>
    public IReadOnlyList<PlanetId> EnemyPlanets { get; init; } = [];

    /// <summary>Points the enemy has saved up; part of its memory.</summary>
    public int EnemyBudget { get; init; }

    /// <summary>Game second of the enemy's last tick.</summary>
    public long EnemyLastTick { get; init; }

    /// <summary>How many scheduled attacks on Earth the enemy has sent.</summary>
    public int EarthAttacksSent { get; init; }

    /// <summary>The objective planets that score points.</summary>
    public IReadOnlyList<PlanetId> Objectives { get; init; } = [];

    /// <summary>Points the team has scored.</summary>
    public int TeamScore { get; init; }

    /// <summary>Points the enemy has scored.</summary>
    public int EnemyScore { get; init; }

    /// <summary>How many whole game hours have already been scored.</summary>
    public int HoursScored { get; init; }

    /// <summary>How the game ended; null while it is running.</summary>
    public GameOutcome? Outcome { get; init; }

    /// <summary>Events made outside Advance (a player's capture); the next Advance reports them.</summary>
    public IReadOnlyList<GameEvent> PendingEvents { get; init; } = [];

    /// <summary>Fleets in flight, or parked where their owner has no base.</summary>
    public IReadOnlyList<Fleet> Fleets { get; init; } = [];

    /// <summary>Enemy fleets already announced with a FleetSpotted event, so each is announced once.</summary>
    public IReadOnlyList<FleetId> SpottedFleets { get; init; } = [];

    /// <summary>Counter for fleet ids.</summary>
    public int NextFleetNumber { get; init; } = 1;

    /// <summary>Every player's stockpile and bases.</summary>
    public IReadOnlyList<PlayerState> Players { get; init; } = [];

    /// <summary>The player with this id, if in the game.</summary>
    public PlayerState? PlayerById(PlayerId playerId) => Players.FirstOrDefault(known => known.Id == playerId);

    /// <summary>A copy with one player replaced.</summary>
    public GameState WithPlayer(PlayerState player) =>
        this with { Players = [.. Players.Select(existing => existing.Id == player.Id ? player : existing)] };

    /// <summary>A planet's composition, if known.</summary>
    public PlanetData? PlanetById(PlanetId planetId) => Planets.FirstOrDefault(known => known.Id == planetId);
}
