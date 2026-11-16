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

    /// <summary>True when a shipyard is finished.</summary>
    public bool HasShipyard { get; init; }

    /// <summary>True when a defense building is finished.</summary>
    public bool HasDefense { get; init; }

    /// <summary>Ships waiting at the planet.</summary>
    public IReadOnlyDictionary<ShipType, int> Ships { get; init; } = new Dictionary<ShipType, int>();

    /// <summary>Hit points lost per ship type among the parked ships; a shipyard heals them over time.</summary>
    public IReadOnlyDictionary<ShipType, int> Damage { get; init; } = new Dictionary<ShipType, int>();

    /// <summary>Game second the <see cref="Damage"/> was last brought up to date (healing counts from here).</summary>
    public long DamagedAt { get; init; }

    /// <summary>Items being built, in order.</summary>
    public IReadOnlyList<QueueItem> Queue { get; init; } = [];

    /// <summary>Mine level counting items still in the queue.</summary>
    public int PendingMineLevel(Element element) =>
        Mines.GetValueOrDefault(element) + Queue.Count(i => i.Building == BuildingType.Mine && i.Element == element);

    /// <summary>True when the building is finished or queued.</summary>
    public bool HasOrQueues(BuildingType type) => type switch
    {
        BuildingType.Shipyard => HasShipyard || QueuedCount(type) > 0,
        BuildingType.Defense => HasDefense || QueuedCount(type) > 0,
        _ => false,
    };

    /// <summary>When a new item could start: now, or when the last queued item ends.</summary>
    public long QueueEnd(long nowSeconds) => Queue.Count == 0 ? nowSeconds : Math.Max(nowSeconds, Queue[^1].FinishAt);

    private int QueuedCount(BuildingType type) => Queue.Count(i => i.Building == type);
}

/// <summary>An upgrade being researched; it finishes at <paramref name="FinishAt"/>.</summary>
public sealed record ResearchJob(UpgradeType Type, int Level, long FinishAt, Resources Cost);

/// <summary>One player: the single stockpile, a base per planet and a counter for queue item ids.</summary>
public sealed record PlayerState(PlayerId Id, Stockpile Stock, IReadOnlyList<Holding> Holdings, int NextItemNumber = 1)
{
    /// <summary>Finished upgrade levels.</summary>
    public IReadOnlyDictionary<UpgradeType, int> Upgrades { get; init; } = new Dictionary<UpgradeType, int>();

    /// <summary>Team points this player earned (captures and held objectives).</summary>
    public int Points { get; init; }

    /// <summary>The upgrade being researched (one at a time), if any.</summary>
    public ResearchJob? Research { get; init; }

    /// <summary>Finished level of an upgrade (0 when never researched).</summary>
    public int UpgradeLevel(UpgradeType type) => Upgrades.GetValueOrDefault(type);

    /// <summary>The player's base on a planet, if any.</summary>
    public Holding? HoldingAt(PlanetId planet) => Holdings.FirstOrDefault(h => h.Planet == planet);

    /// <summary>A copy with one holding replaced.</summary>
    public PlayerState WithHolding(Holding holding) =>
        this with { Holdings = [.. Holdings.Select(h => h.Planet == holding.Planet ? holding : h)] };
}
