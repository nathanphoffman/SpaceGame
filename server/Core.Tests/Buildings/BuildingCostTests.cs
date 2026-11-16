using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class BuildingCostTests
{
    [Fact]
    public void BuildingTakesCostUpFront()
    {
        var (state, r) = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null), 100);
        Assert.True(r.Ok);
        Assert.Equal(900, state.PlayerById(Me)!.Stock.Amount.Iron);
        var item = At(state).Queue.Single();
        Assert.Equal(100 + 30 * Minute, item.FinishAt);
    }

    [Fact]
    public void LaterMineLevelsCostMore()
    {
        var state = Do(Game(holding: new Holding(Earth) { Mines = new Dictionary<Element, int> { [Element.Iron] = 1 } }), new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        var second = At(state).Queue.Single();
        Assert.Equal(80, second.Cost.Iron);
        Assert.Equal(30 * Minute, second.FinishAt);
        Assert.Equal(2, second.Level);
    }

    [Fact]
    public void BusyPlanetRefusesASecondItem()
    {
        var state = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 1)).State;
        var busy = "This planet is busy. Wait for it to finish, or cancel what it is doing.";
        Assert.Equal(busy, Error(state, new BuildBuilding(Earth, BuildingType.Defense, null)));
        Assert.Equal(busy, Error(state, new QueueShip(Earth, ShipType.Fighter, 1)));
    }
}
