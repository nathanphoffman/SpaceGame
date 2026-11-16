namespace SpaceGame.Core;

/// <summary>A fleet as the map draws it. All times are game seconds.</summary>
/// <param name="LaunchAt">When it was ordered.</param>
/// <param name="DepartAt">End of the 5-minute prep; it moves after this.</param>
/// <param name="ArriveAt">When it arrives.</param>
public sealed record FleetView(
    FleetId Id, PlayerId? Owner, Side Side, PlanetId From, PlanetId To,
    long LaunchAt, long DepartAt, long ArriveAt,
    IReadOnlyDictionary<ShipType, int> Ships, Resources Cargo)
{
    /// <summary>How many star hops this fleet can see: 2 with a Scout, otherwise 1.</summary>
    public int SightHops { get; init; } = 1;
}

/// <summary>What one player may see, with fog of war applied and the stockpile brought up to date.</summary>
/// <param name="Version">Changes whenever the state changes.</param>
/// <param name="GameTime">Server game time, so the client can animate in sync.</param>
public sealed record PlayerView(
    long Version, long GameTime, long TimeLeftSeconds, int TeamScore, int EnemyScore,
    Resources Stockpile, IReadOnlyList<FleetView> Fleets, IReadOnlyList<BattleReport> Reports)
{
    /// <summary>Planets where the player has a base.</summary>
    public IReadOnlyList<PlanetId> OwnPlanets { get; init; } = [];

    /// <summary>The player's bases: buildings, parked ships and queues.</summary>
    public IReadOnlyList<Holding> Holdings { get; init; } = [];

    /// <summary>Planets held by the player, their allies, or the enemy (only where a teammate is present).</summary>
    public IReadOnlyList<PlanetControl> Territory { get; init; } = [];
}

/// <summary>Public map data: systems, planets and richness.</summary>
public sealed record GalaxyMap(IReadOnlyList<SystemInfo> Systems, PlanetId? EnemyHome = null);

/// <summary>A star system on the map.</summary>
public sealed record SystemInfo(SystemId Id, string Name, double X, double Y, double Z, IReadOnlyList<PlanetInfo> Planets);

/// <summary>A planet on the map. Richness is 0 to 100 per element.</summary>
public sealed record PlanetInfo(PlanetId Id, string Name, bool IsObjective, IReadOnlyDictionary<Element, int> Richness);

/// <summary>The trip timer for a send order: prep plus flight.</summary>
public sealed record FlightQuote(bool Ok, string? Error, long DepartAt, long ArriveAt);

/// <summary>The record of one battle.</summary>
public sealed record BattleReport(string Id, long Time, PlanetId Planet, bool AttackersWon, int Rounds);
