using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class ShipQueueTests
{
    [Fact]
    public void ShipsNeedAShipyard() =>
        Assert.Equal("Build a shipyard on this planet first.", Error(Game(), new QueueShip(Earth, ShipType.Fighter, 1)));

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void ShipCountMustBeInRange(int count) =>
        Assert.Equal("Order between 1 and 100 ships.", Error(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, count)));

    [Fact]
    public void ShipOrderCostsEverythingUpFront()
    {
        var (state, r) = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 3));
        Assert.True(r.Ok);
        Assert.Equal(940, state.PlayerById(Me)!.Stock.Amount.Iron);
        Assert.Equal([10 * Minute, 20 * Minute, 30 * Minute], At(state).Queue.Select(i => i.FinishAt));
        Assert.Equal(3, At(state).Queue.Select(i => i.Id).Distinct().Count());
        Assert.Equal("Not enough resources.", Error(Game(new Resources(50, 0, 0, 0), WithYard()), new QueueShip(Earth, ShipType.Fighter, 3)));
    }
}
