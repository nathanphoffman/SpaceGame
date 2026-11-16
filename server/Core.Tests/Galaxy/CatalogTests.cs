namespace SpaceGame.Core.Tests;

public class CatalogTests
{
    private static readonly Catalog C = Catalog.Default;

    public sealed record ShipRow(ShipType Type, int HitsOn, int Shots, int Hp, double Speed, int Cargo,
        Resources Cost, long Seconds);

    public static TheoryData<ShipRow> ShipRows => new()
    {
        new ShipRow(ShipType.Scout, 0, 0, 1, 3.0, 0, new Resources(10, 10, 0, 0), 300),
        new ShipRow(ShipType.Hauler, 0, 0, 1, 1.0, 100, new Resources(40, 20, 0, 0), 1800),
        new ShipRow(ShipType.Colony, 0, 0, 1, 1.0, 0, new Resources(80, 60, 0, 0), 3600),
        new ShipRow(ShipType.Fighter, 5, 1, 1, 1.5, 0, new Resources(20, 0, 0, 0), 600),
        new ShipRow(ShipType.Battleship, 4, 2, 4, 1.0, 0, new Resources(60, 0, 20, 0), 2700),
        new ShipRow(ShipType.Dreadnought, 3, 5, 10, 0.6, 0, new Resources(200, 0, 150, 100), 14400),
    };

    [Theory]
    [MemberData(nameof(ShipRows))]
    public void ShipsMatchSpec(ShipRow row)
    {
        var spec = C.Ship(row.Type);
        Assert.Equal((row.HitsOn, row.Shots, row.Hp, row.Speed, row.Cargo),
            (spec.HitsOn, spec.Shots, spec.Hp, spec.Speed, spec.Cargo));
        Assert.Equal(row.Cost, spec.Cost);
        Assert.Equal(row.Seconds, spec.BuildSeconds);
    }

    [Fact]
    public void EveryTypeIsInTheCatalog()
    {
        foreach (var t in Enum.GetValues<ShipType>()) Assert.Equal(t, C.Ship(t).Type);

        foreach (var t in Enum.GetValues<BuildingType>()) Assert.Equal(t, C.Building(t).Type);

    }

    [Fact]
    public void BuildingsMatchSpec()
    {
        var mine = C.Building(BuildingType.Mine);
        Assert.Equal(new Resources(50, 0, 0, 0), mine.CostAtLevel(1));
        Assert.Equal(new Resources(80, 0, 0, 0), mine.CostAtLevel(2));
        Assert.Equal(1200, mine.SecondsAtLevel(1));
        Assert.Equal(1800, mine.SecondsAtLevel(2));
        Assert.Equal(3, mine.MaxLevel);
        var yard = C.Building(BuildingType.Shipyard);
        Assert.Equal((new Resources(100, 0, 0, 0), 1800L), (yard.Cost, yard.BuildSeconds));
        var def = C.Building(BuildingType.Defense);
        Assert.Equal((new Resources(100, 0, 20, 0), 3600L), (def.Cost, def.BuildSeconds));
    }

    [Fact]
    public void MineOutputIsTenPerHourTimesTwoTimesRichness()
    {
        Assert.Equal(20.0, C.Mine.OutputPerHour(1, 100));
        Assert.Equal(10.0, C.Mine.OutputPerHour(1, 50));
        Assert.Equal(26.0, C.Mine.OutputPerHour(2, 100), 6);
    }

    [Fact]
    public void ShipyardDefenseAndMiningHaveNoTopLevel() =>
        Assert.All([BuildingType.Shipyard, BuildingType.Defense, BuildingType.Mining], type => Assert.Equal(int.MaxValue, C.Building(type).MaxLevel));

    [Fact]
    public void ConfigCarriesTheCatalog() => Assert.Same(C, new GameConfig().Catalog);
}
