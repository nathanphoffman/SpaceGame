using static SpaceGame.Core.Tests.UpgradeFixture;

namespace SpaceGame.Core.Tests;

public class UpgradeEffectTests
{
    [Fact]
    public void EnginesRaiseFleetSpeed()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Engines).State, 3 * Hour));
        var ships = new Dictionary<ShipType, int> { [ShipType.Hauler] = 1 };
        Assert.Equal(1.25, Upgrades.FleetSpeed(Cat, p, ships), 6);
    }

    [Fact]
    public void WeaponsLowerHitNumberButNotBelowTwo()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Weapons).State, 5 * Hour));
        Assert.Equal(4, Upgrades.BattleShipFor(Cat, p, ShipType.Fighter).HitsOn);
        Assert.Equal(2, Upgrades.BattleShipFor(Cat, p, ShipType.Dreadnought).HitsOn);
        Assert.Equal(0, Upgrades.BattleShipFor(Cat, p, ShipType.Scout).HitsOn);
    }

    [Fact]
    public void ArmorAddsHpToArmedShipsOnly()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Armor).State, 4 * Hour));
        Assert.Equal(2, Upgrades.BattleShipFor(Cat, p, ShipType.Fighter).Hp);
        Assert.Equal(5, Upgrades.BattleShipFor(Cat, p, ShipType.Battleship).Hp);
        Assert.Equal(10, Upgrades.BattleShipFor(Cat, p, ShipType.Dreadnought).Hp);
    }
}
