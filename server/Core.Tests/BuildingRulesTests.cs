using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class BuildingRulesTests
{
    [Fact]
    public void UnknownPlayerIsRejected() =>
        Assert.Equal("You are not in this game.",
            GameEngineFactory.Create().Apply(Game(), new PlayerId("x"), new BuildBuilding(Earth, BuildingType.Shipyard, null), 0).Result.Error);

    [Fact]
    public void PlanetWithoutBaseIsRejected() =>
        Assert.Equal("You have no base on that planet.", Error(Game(), new BuildBuilding(Moon, BuildingType.Shipyard, null)));

    [Fact]
    public void MineNeedsAnElement() =>
        Assert.Equal("Choose which element the mine digs.", Error(Game(), new BuildBuilding(Earth, BuildingType.Mine, null)));

    [Fact]
    public void MineNeedsRichnessOnThePlanet() =>
        Assert.Equal("This planet has no Helium3 to mine.", Error(Game(), new BuildBuilding(Earth, BuildingType.Mine, Element.Helium3)));

    [Fact]
    public void ShipyardCanOnlyBeBuiltOnce()
    {
        var (state, r) = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null));
        Assert.True(r.Ok);
        Assert.Equal("This planet already has a shipyard.", Error(state, new BuildBuilding(Earth, BuildingType.Shipyard, null)));
    }

    [Fact]
    public void FinishedDefenseCannotBeBuiltAgain() =>
        Assert.Equal("This planet already has a defense.",
            Error(Game(holding: new Holding(Earth) { HasDefense = true }), new BuildBuilding(Earth, BuildingType.Defense, null)));

    [Fact]
    public void MineStopsAtLevelThree()
    {
        var state = Game();

        for (var i = 0; i < 3; i++) state = Do(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        Assert.Equal("The Iron mine is already at its top level.", Error(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)));
        Assert.Equal(3, At(state).Queue.Count);
    }

    [Fact]
    public void NotEnoughResourcesIsRejected()
    {
        var state = Game(new Resources(10, 0, 0, 0));
        var (after, result) = Do(state, new BuildBuilding(Earth, BuildingType.Shipyard, null));
        Assert.Equal("Not enough resources.", result.Error);
        Assert.Equal(state, after);
    }
}
