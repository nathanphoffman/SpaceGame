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

/// <summary>Mine numbers: output per hour is <c>BaseOutputPerHour * richness / 100</c>, times <c>OutputGrowth^(level-1)</c>, times <c>1 + MiningBonusPerLevel * the planet's Mining level</c>.</summary>
public sealed record MineRules(double BaseOutputPerHour, double OutputGrowth, int MaxRichness = 100, double MiningBonusPerLevel = 0.30)
{
    /// <summary>Output per hour of a mine of this level on a planet with this richness (before upgrades).</summary>
    public double OutputPerHour(int level, int richness) =>
        BaseOutputPerHour * richness / MaxRichness * Math.Pow(OutputGrowth, level - 1);
}

/// <summary>Every ship and building of the game, as data, so balance changes never touch the rules code.</summary>
public sealed record Catalog(
    IReadOnlyList<ShipSpec> Ships,
    IReadOnlyList<BuildingSpec> Buildings,
    MineRules Mine,
    double ShipyardSpeedPerLevel = 0.25)
{

    private const int NoLimit = int.MaxValue; // shipyard, defense and mining levels never stop

    /// <summary>The starting numbers from SPEC.md.</summary>
    public static readonly Catalog Default = new(
        [
            new(ShipType.Scout, 0, 0, 1, 3.0, 0, new(10, 10, 0, 0), 5 * GameSeconds.Minute),
            new(ShipType.Hauler, 0, 0, 1, 1.0, 100, new(40, 20, 0, 0), 30 * GameSeconds.Minute),
            new(ShipType.Colony, 0, 0, 1, 1.0, 0, new(80, 60, 0, 0), GameSeconds.Hour),
            new(ShipType.Fighter, 5, 1, 1, 1.5, 0, new(20, 0, 0, 0), 10 * GameSeconds.Minute),
            new(ShipType.Battleship, 4, 2, 4, 1.0, 0, new(60, 0, 20, 0), 45 * GameSeconds.Minute),
            new(ShipType.Dreadnought, 3, 5, 10, 0.6, 0, new(200, 0, 150, 100), 4 * GameSeconds.Hour),
        ],
        [
            new(BuildingType.Mine, 3, new(50, 0, 0, 0), 20 * GameSeconds.Minute, 1.6, 1.5),
            new(BuildingType.Shipyard, NoLimit, new(100, 0, 0, 0), 30 * GameSeconds.Minute, 1.6, 1.3),
            new(BuildingType.Defense, NoLimit, new(100, 0, 20, 0), GameSeconds.Hour, 1.6, 1.3),
            new(BuildingType.Mining, NoLimit, new(0, 0, 50, 20), 2 * GameSeconds.Hour, 1.6, 1.3),
        ],
        new MineRules(BaseOutputPerHour: 20, OutputGrowth: 1.3));

    /// <summary>The ship stats for a type.</summary>
    public ShipSpec Ship(ShipType type) => Ships.Single(spec => spec.Type == type);

    /// <summary>The building stats for a type.</summary>
    public BuildingSpec Building(BuildingType type) => Buildings.Single(building => building.Type == type);
}
