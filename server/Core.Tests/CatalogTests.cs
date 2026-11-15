namespace SpaceGame.Core.Tests;

public class CatalogTests
{
    private static readonly Catalog C = Catalog.Default;

    [Theory]
    [InlineData(ShipType.Scout, 0, 0, 1, 3.0, 0, 10, 10, 0, 0, 300)]
    [InlineData(ShipType.Hauler, 0, 0, 1, 1.0, 100, 40, 20, 0, 0, 1800)]
    [InlineData(ShipType.Colony, 0, 0, 1, 1.0, 0, 80, 60, 0, 0, 3600)]
    [InlineData(ShipType.Fighter, 5, 1, 1, 1.5, 0, 20, 0, 0, 0, 600)]
    [InlineData(ShipType.Battleship, 4, 2, 4, 1.0, 0, 60, 0, 20, 0, 2700)]
    [InlineData(ShipType.Dreadnought, 3, 5, 10, 0.6, 0, 200, 0, 150, 100, 14400)]
    public void ShipsMatchSpec(ShipType type, int hitsOn, int shots, int hp, double speed, int cargo,
        int fe, int h, int ti, int he, long seconds)
    {
        var spec = C.Ship(type);
        Assert.Equal((hitsOn, shots, hp, speed, cargo), (spec.HitsOn, spec.Shots, spec.Hp, spec.Speed, spec.Cargo));
        Assert.Equal(new Resources(fe, h, ti, he), spec.Cost);
        Assert.Equal(seconds, spec.BuildSeconds);
    }

    [Fact]
    public void EveryTypeIsInTheCatalog()
    {
        foreach (var t in Enum.GetValues<ShipType>()) Assert.Equal(t, C.Ship(t).Type);

        foreach (var t in Enum.GetValues<BuildingType>()) Assert.Equal(t, C.Building(t).Type);

        foreach (var t in Enum.GetValues<UpgradeType>()) Assert.Equal(t, C.Upgrade(t).Type);
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
    public void UpgradesMatchSpec()
    {
        Assert.Equal((3, 0.25), (C.Upgrade(UpgradeType.Engines).MaxLevel, C.Upgrade(UpgradeType.Engines).BonusPerLevel));
        Assert.Equal(1, C.Upgrade(UpgradeType.Weapons).MaxLevel);
        Assert.Equal(1, C.Upgrade(UpgradeType.Armor).MaxLevel);
        Assert.Equal((3, 0.30), (C.Upgrade(UpgradeType.Mining).MaxLevel, C.Upgrade(UpgradeType.Mining).BonusPerLevel));
        Assert.All(C.Upgrades, u => Assert.True(u.BuildSeconds >= 3600 && u.Cost.Titanium > 0));
    }

    [Fact]
    public void ConfigCarriesTheCatalog() => Assert.Same(C, new GameConfig().Catalog);
}
