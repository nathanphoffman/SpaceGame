namespace SpaceGame.Core;

/// <summary>Stats of one ship class. Times are game seconds.</summary>
/// <param name="HitsOn">Roll needed to hit; 0 means the ship has no weapons.</param>
public sealed record ShipSpec(
    ShipType Type, int HitsOn, int Shots, int Hp, double Speed, int Cargo, Resources Cost, long BuildSeconds);

/// <summary>Stats of one building. Level N costs <c>Cost * CostGrowth^(N-1)</c> and takes <c>BuildSeconds * TimeGrowth^(N-1)</c>.</summary>
public sealed record BuildingSpec(
    BuildingType Type, int MaxLevel, Resources Cost, long BuildSeconds, double CostGrowth, double TimeGrowth)
{
    /// <summary>Cost to build the given level (1-based).</summary>
    public Resources CostAtLevel(int level) => Cost.Scale(Math.Pow(CostGrowth, level - 1));

    /// <summary>Grows by TimeGrowth each level, so later levels take longer (level is 1-based).</summary>
    public long SecondsAtLevel(int level) => (long)Math.Round(BuildSeconds * Math.Pow(TimeGrowth, level - 1));
}

/// <summary>Stats of one upgrade. Level N costs <c>Cost * CostGrowth^(N-1)</c>; each level adds <paramref name="BonusPerLevel"/> (a fraction).</summary>
public sealed record UpgradeSpec(
    UpgradeType Type, int MaxLevel, Resources Cost, long BuildSeconds, double CostGrowth, double BonusPerLevel)
{
    /// <summary>Cost to research the given level (1-based).</summary>
    public Resources CostAtLevel(int level) => Cost.Scale(Math.Pow(CostGrowth, level - 1));
}

/// <summary>Mine numbers: output per hour is <c>BaseOutputPerHour * richness / 100</c>, times <c>OutputGrowth^(level-1)</c>.</summary>
public sealed record MineRules(double BaseOutputPerHour, double OutputGrowth, int MaxRichness = 100)
{
    /// <summary>Output per hour of a mine of this level on a planet with this richness (before upgrades).</summary>
    public double OutputPerHour(int level, int richness) =>
        BaseOutputPerHour * richness / MaxRichness * Math.Pow(OutputGrowth, level - 1);
}

/// <summary>Every ship, building and upgrade of the game, as data, so balance changes never touch the rules code.</summary>
public sealed record Catalog(
    IReadOnlyList<ShipSpec> Ships,
    IReadOnlyList<BuildingSpec> Buildings,
    IReadOnlyList<UpgradeSpec> Upgrades,
    MineRules Mine)
{
    private const long Minute = 60;
    private const long Hour = 3600;

    /// <summary>The starting numbers from SPEC.md.</summary>
    public static readonly Catalog Default = new(
        [
            new(ShipType.Scout, 0, 0, 1, 3.0, 0, new(10, 10, 0, 0), 5 * Minute),
            new(ShipType.Hauler, 0, 0, 1, 1.0, 100, new(40, 20, 0, 0), 30 * Minute),
            new(ShipType.Colony, 0, 0, 1, 1.0, 0, new(80, 60, 0, 0), Hour),
            new(ShipType.Fighter, 5, 1, 1, 1.5, 0, new(20, 0, 0, 0), 10 * Minute),
            new(ShipType.Battleship, 4, 2, 4, 1.0, 0, new(60, 0, 20, 0), 45 * Minute),
            new(ShipType.Dreadnought, 3, 5, 10, 0.6, 0, new(200, 0, 150, 100), 4 * Hour),
        ],
        [
            new(BuildingType.Mine, 3, new(50, 0, 0, 0), 20 * Minute, 1.6, 1.5),
            new(BuildingType.Shipyard, 1, new(100, 0, 0, 0), 30 * Minute, 1.0, 1.0),
            new(BuildingType.Defense, 1, new(100, 0, 20, 0), Hour, 1.0, 1.0),
        ],
        [
            new(UpgradeType.Engines, 3, new(0, 0, 40, 10), 2 * Hour, 1.5, 0.25),
            new(UpgradeType.Weapons, 1, new(0, 0, 100, 40), 4 * Hour, 1.0, 1),
            new(UpgradeType.Armor, 1, new(0, 0, 80, 30), 3 * Hour, 1.0, 1),
            new(UpgradeType.Mining, 3, new(0, 0, 50, 20), 2 * Hour, 1.5, 0.30),
        ],
        new MineRules(BaseOutputPerHour: 20, OutputGrowth: 1.3));

    /// <summary>The ship stats for a type.</summary>
    public ShipSpec Ship(ShipType type) => Ships.Single(spec => spec.Type == type);

    /// <summary>The building stats for a type.</summary>
    public BuildingSpec Building(BuildingType type) => Buildings.Single(building => building.Type == type);

    /// <summary>The upgrade stats for a type.</summary>
    public UpgradeSpec Upgrade(UpgradeType type) => Upgrades.Single(u => u.Type == type);
}
