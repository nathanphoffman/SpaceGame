using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class BuildingCostTests
{
    [Fact]
    public void BuildingTakesCostUpFrontAndQueuesWithItsTime()
    {
        var (state, r) = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null), 100);
        Assert.True(r.Ok);
        Assert.Equal(900, state.PlayerById(Me)!.Stock.Amount.Iron);
        var item = At(state).Queue.Single();
        Assert.Equal(100 + 30 * Minute, item.FinishAt);
    }

    [Fact]
    public void LaterMineLevelsCostAndTakeMore()
    {
        var state = Do(Game(), new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        var second = At(state).Queue[1];
        Assert.Equal(80, second.Cost.Iron);
        Assert.Equal(20 * Minute + 30 * Minute, second.FinishAt);
        Assert.Equal(2, second.Level);
    }

    [Fact]
    public void ItemsRunOneAfterAnother()
    {
        var state = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 1)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null)).State;
        Assert.Equal(10 * Minute + 60 * Minute, At(state).Queue[1].FinishAt);
    }
}
