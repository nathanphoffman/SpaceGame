using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class BuildingRulesTests
{
    [Fact]
    public void UnknownPlayerIsRejected() =>
        Assert.Equal("You are not in this game.",
            GameEngineFactory.Create().Apply(Game(), new PlayerId("x"), new BuildBuilding(Earth, BuildingType.Shipyard, null), 0).Result.Error);

    public static TheoryData<BuildBuilding, string> Rejections => new()
    {
        { new BuildBuilding(Moon, BuildingType.Shipyard, null), "You have no base on that planet." },
        { new BuildBuilding(Earth, BuildingType.Mine, null), "Choose which element the mine digs." },
        { new BuildBuilding(Earth, BuildingType.Mine, Element.Helium3), "This planet has no Helium3 to mine." },
    };

    [Theory]
    [MemberData(nameof(Rejections))]
    public void InvalidBuildIsRejected(BuildBuilding command, string error) => Assert.Equal(error, Error(Game(), command));

    [Fact]
    public void MineStopsAtLevelThree()
    {
        var state = Game(holding: new Holding(Earth) { Mines = new Dictionary<Element, int> { [Element.Iron] = 3 } });
        Assert.Equal("The Iron mine is already at its top level.", Error(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)));
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
