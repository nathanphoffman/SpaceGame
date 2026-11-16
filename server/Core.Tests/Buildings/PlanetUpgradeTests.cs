using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class PlanetUpgradeTests
{
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    private static Holding Built(int shipyard = 0, int defense = 0, int mining = 0) =>
        new(Earth) { ShipyardLevel = shipyard, DefenseLevel = defense, MiningLevel = mining, Mines = new Dictionary<Element, int> { [Element.Iron] = 1 } };

    [Theory]
    [InlineData(BuildingType.Shipyard)]
    [InlineData(BuildingType.Defense)]
    [InlineData(BuildingType.Mining)]
    public void EachUpgradeRaisesTheLevelByOneWhenItFinishes(BuildingType type)
    {
        var state = Do(Game(holding: Built(shipyard: 1, defense: 1, mining: 1)), new BuildBuilding(Earth, type, null)).State;
        var item = At(state).Queue.Single();
        Assert.Equal(2, item.Level);

        var (done, _) = Engine.Advance(state, item.FinishAt, new FixedDice());
        var holding = At(done);
        Assert.Equal(2, type switch { BuildingType.Shipyard => holding.ShipyardLevel, BuildingType.Defense => holding.DefenseLevel, _ => holding.MiningLevel });
    }

    [Fact]
    public void TheFirstShipyardIsLevelOneAndLaterLevelsCostMoreAndTakeLonger()
    {
        var first = At(Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null)).State).Queue.Single();
        var third = At(Do(Game(holding: Built(shipyard: 2)), new BuildBuilding(Earth, BuildingType.Shipyard, null)).State).Queue.Single();

        Assert.Equal(1, first.Level);
        Assert.Equal(3, third.Level);
        Assert.True(third.Cost.Iron > first.Cost.Iron);
        Assert.True(third.FinishAt > first.FinishAt);
    }

    [Fact]
    public void HigherShipyardLevelsBuildShipsFaster()
    {
        var level1 = At(Do(Game(holding: Built(shipyard: 1)), new QueueShip(Earth, ShipType.Fighter, 1)).State).Queue.Single();
        var level5 = At(Do(Game(holding: Built(shipyard: 5)), new QueueShip(Earth, ShipType.Fighter, 1)).State).Queue.Single();

        Assert.Equal(10 * Minute, level1.FinishAt);
        Assert.Equal(5 * Minute, level5.FinishAt); // 1 + 0.25 * 4 = 2 times as fast
    }

    [Fact]
    public void MiningLevelRaisesTheOutputOfTheMinesOnThatPlanet()
    {
        var plain = Engine.ViewFor(Game(holding: Built(shipyard: 1)), Me, 3600).Stockpile.Iron;
        var boosted = Engine.ViewFor(Game(holding: Built(shipyard: 1, mining: 2)), Me, 3600).Stockpile.Iron;

        Assert.True(boosted > plain);
        Assert.Equal(1.6, (boosted - 1000) / (double)(plain - 1000), 1); // +30% per level, two levels
    }

    [Fact]
    public void LevelsHaveNoTopButTheCostEventuallyOutgrowsAnyStockpile()
    {
        var state = Game(new Resources(int.MaxValue / 4, 0, int.MaxValue / 4, 0), Built(defense: 60));
        var (_, result) = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null));

        Assert.Equal("Not enough resources.", result.Error);
    }

    [Fact]
    public void AMiningUpgradeNeedsABaseOnThePlanet() =>
        Assert.Equal("You have no base on that planet.", Error(Game(), new BuildBuilding(Moon, BuildingType.Mining, null)));

    [Fact]
    public void LevelsSurviveAJsonRoundTrip()
    {
        var back = System.Text.Json.JsonSerializer.Deserialize<Holding>(System.Text.Json.JsonSerializer.Serialize(Built(shipyard: 3, defense: 4, mining: 5)))!;

        Assert.Equal((3, 4, 5), (back.ShipyardLevel, back.DefenseLevel, back.MiningLevel));
        Assert.True(back.HasShipyard && back.HasDefense);
    }
}
