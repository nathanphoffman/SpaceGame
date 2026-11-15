using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class FleetSendTests
{
    [Fact]
    public void SendTakesTheShips()
    {
        var quote = Engine.Quote(FleetGame(), Me, Send(), 100);
        var state = Sent(100);
        var fleet = Assert.Single(state.Fleets);
        Assert.Equal(2, FightersHome(state));
        Assert.Equal(100, fleet.LaunchAt);
        Assert.Equal(100 + Prep, fleet.DepartAt);
        Assert.Equal(quote.ArriveAt, fleet.ArriveAt);
        Assert.Equal(2, fleet.Ships[ShipType.Fighter]);
    }

    [Fact]
    public void FleetIdsAreUnique()
    {
        var state = Do(Sent(), Send(1)).State;
        Assert.Equal(2, state.Fleets.Select(f => f.Id).Distinct().Count());
    }

    [Theory]
    [InlineData(9, "You do not have those ships there.")]
    [InlineData(0, "Choose at least one ship.")]
    public void BadShipCountsAreRejected(int fighters, string error)
    {
        Assert.Equal(error, Do(FleetGame(), Send(fighters)).Result.Error);
    }

    [Fact]
    public void SendingToTheSamePlanetIsRejected()
    {
        var send = Send() with { To = StartingKit.EarthId };
        Assert.Equal("Choose a different destination.", Do(FleetGame(), send).Result.Error);
    }

    [Fact]
    public void CargoNeedsHaulerCapacity()
    {
        Assert.Equal("Your Haulers cannot carry that much.", Do(FleetGame(), Send(cargo: new Resources(10, 0, 0, 0))).Result.Error);
        var state = Do(FleetGame(), new QueueShip(StartingKit.EarthId, ShipType.Hauler, 1)).State;
        state = Engine.Advance(state, 3600, new SeqDice()).State;
        Assert.Equal("You do not have that cargo in your stockpile.",
            Do(state, Send(0, new Resources(0, 0, 0, 50), 1), 3600).Result.Error);
    }

    [Fact]
    public void CargoLeavesTheStockpile()
    {
        var state = Do(FleetGame(), new QueueShip(StartingKit.EarthId, ShipType.Hauler, 1)).State;
        state = Engine.Advance(state, 3600, new SeqDice()).State;
        var before = state.PlayerById(Me)!.Stock.AdvanceTo(3600, Economy.RatePerHourMilli(state, state.PlayerById(Me)!)).Amount;
        var sent = Do(state, Send(0, new Resources(0, 50, 0, 0), 1), 3600).State;
        Assert.Equal(before.Hydrogen - 50, sent.PlayerById(Me)!.Stock.Amount.Hydrogen);
        Assert.Equal(50, Assert.Single(sent.Fleets).Cargo.Hydrogen);
    }
}
