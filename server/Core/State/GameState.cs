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

    /// <summary>The objective planets that score points.</summary>
    public IReadOnlyList<PlanetId> Objectives { get; init; } = [];

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
