namespace SpaceGame.Core;

/// <summary>What a planet is made of. Richness is 0 to 100 per element.</summary>
public sealed record PlanetData(PlanetId Id, IReadOnlyDictionary<Element, int> Richness)
{
    /// <summary>Richness of one element (0 when missing).</summary>
    public int RichnessOf(Element element) => Richness.GetValueOrDefault(element);
}

/// <summary>One queued building or ship. Items of a planet run one after another.</summary>
/// <param name="Ship">Set for a ship; otherwise <paramref name="Building"/> is set.</param>
/// <param name="Level">Level of the building once finished (1 for ships).</param>
public sealed record QueueItem(
    string Id, BuildingType? Building, Element? Element, ShipType? Ship, int Level,
    long StartAt, long FinishAt, Resources Cost);

/// <summary>A player's base on one planet: finished buildings, ships parked there and the build queue.</summary>
public sealed record Holding(PlanetId Planet)
{
    /// <summary>Finished mine levels per element.</summary>
    public IReadOnlyDictionary<Element, int> Mines { get; init; } = new Dictionary<Element, int>();

    /// <summary>Shipyard level: 0 when there is none. Each level above 1 builds ships faster.</summary>
    public int ShipyardLevel { get; init; }

    /// <summary>Defense level: 0 when there is none. Each level gives every defending ship one reroll of a missed shot.</summary>
    public int DefenseLevel { get; init; }

    /// <summary>Mining level of this planet: each level adds to the output of every mine here.</summary>
    public int MiningLevel { get; init; }

    /// <summary>True when a shipyard is finished.</summary>
    public bool HasShipyard { get => ShipyardLevel > 0; init => ShipyardLevel = value ? Math.Max(1, ShipyardLevel) : 0; }

    /// <summary>True when a defense building is finished.</summary>
    public bool HasDefense { get => DefenseLevel > 0; init => DefenseLevel = value ? Math.Max(1, DefenseLevel) : 0; }

    /// <summary>Ships waiting at the planet.</summary>
    public IReadOnlyDictionary<ShipType, int> Ships { get; init; } = new Dictionary<ShipType, int>();

    /// <summary>Hit points lost per ship type among the parked ships; a shipyard heals them over time.</summary>
    public IReadOnlyDictionary<ShipType, int> Damage { get; init; } = new Dictionary<ShipType, int>();

    /// <summary>Game second the <see cref="Damage"/> was last brought up to date (healing counts from here).</summary>
    public long DamagedAt { get; init; }

    /// <summary>Orders that repeat by themselves whenever the planet is idle and the player can pay, first one first.</summary>
    public IReadOnlyList<AutoOrder> Auto { get; init; } = [];

    /// <summary>Items being built, in order.</summary>
    public IReadOnlyList<QueueItem> Queue { get; init; } = [];

    /// <summary>Mine level counting items still in the queue.</summary>
    public int PendingMineLevel(Element element) =>
        Mines.GetValueOrDefault(element) + Queue.Count(i => i.Building == BuildingType.Mine && i.Element == element);

    /// <summary>The level the next build of this building would have.</summary>
    public int NextLevel(BuildingType type, Element? element) => type switch
    {
        BuildingType.Mine => element is { } e ? PendingMineLevel(e) + 1 : 1,
        BuildingType.Shipyard => ShipyardLevel + 1,
        BuildingType.Defense => DefenseLevel + 1,
        _ => MiningLevel + 1,
    };

    /// <summary>When a new item could start: now, or when the last queued item ends.</summary>
    public long QueueEnd(long nowSeconds) => Queue.Count == 0 ? nowSeconds : Math.Max(nowSeconds, Queue[^1].FinishAt);
}

/// <summary>One player: the single stockpile, a base per planet and a counter for queue item ids.</summary>
public sealed record PlayerState(PlayerId Id, Stockpile Stock, IReadOnlyList<Holding> Holdings, int NextItemNumber = 1)
{
    /// <summary>Team points this player earned (captures and held objectives).</summary>
    public int Points { get; init; }

    /// <summary>The player's base on a planet, if any.</summary>
    public Holding? HoldingAt(PlanetId planet) => Holdings.FirstOrDefault(h => h.Planet == planet);

    /// <summary>A copy with one holding replaced.</summary>
    public PlayerState WithHolding(Holding holding) =>
        this with { Holdings = [.. Holdings.Select(h => h.Planet == holding.Planet ? holding : h)] };
}
