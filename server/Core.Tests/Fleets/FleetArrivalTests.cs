using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class FleetArrivalTests
{
    [Fact]
    public void AdvanceMovesNothingBeforeArrival()
    {
        var state = Sent();
        var (after, events) = Engine.Advance(state, state.Fleets[0].ArriveAt - 1, new SeqDice());
        Assert.Single(after.Fleets);
        Assert.Empty(events);
    }

    [Fact]
    public void ArrivalWithoutABaseParksTheFleet()
    {
        var state = Sent();
        var (after, events) = Engine.Advance(state, state.Fleets[0].ArriveAt, new SeqDice());
        Assert.True(Assert.Single(after.Fleets).Parked);
        Assert.Equal("FleetArrived", Assert.Single(events).Kind);
        Assert.Single(Engine.Advance(after, after.Fleets[0].ArriveAt + 10, new SeqDice()).State.Fleets);
    }

    [Fact]
    public void ArrivalsResolveInTimeOrder()
    {
        var state = Do(Sent(), Send(1), 50).State;
        var (_, events) = Engine.Advance(state, 100000, new SeqDice());
        var arrived = events.Where(e => e.Kind == "FleetArrived").Select(e => e.Time).ToList();
        Assert.Equal(arrived.Order(), arrived);
    }

    [Fact]
    public void HaulerCargoUnloadsAtAnOwnBase()
    {
        var state = FleetGame();
        var owned = state.PlayerById(Me)! with { Holdings = [.. state.PlayerById(Me)!.Holdings, new Holding(Target)] };
        state = state.WithPlayer(owned) with { Fleets = [HaulerTo(Target, new Resources(0, 0, 0, 40))] };
        var before = state.PlayerById(Me)!.Stock.Amount.Helium3;
        var (after, _) = Engine.Advance(state, 100, new SeqDice());
        Assert.Empty(after.Fleets);
        Assert.Equal(before + 40, after.PlayerById(Me)!.Stock.Amount.Helium3);
        Assert.Equal(1, after.PlayerById(Me)!.HoldingAt(Target)!.Ships[ShipType.Hauler]);
    }

    [Fact]
    public void CargoStaysOnAFleetParkedWithoutABase()
    {
        var state = FleetGame() with { Fleets = [HaulerTo(Target, new Resources(5, 0, 0, 0))] };
        var (after, _) = Engine.Advance(state, 100, new SeqDice());
        Assert.Equal(5, Assert.Single(after.Fleets).Cargo.Iron);
    }

    private static Fleet HaulerTo(PlanetId to, Resources cargo) =>
        new(new FleetId("h1"), Me, StartingKit.EarthId, to, 0, 0, 50,
            new Dictionary<ShipType, int> { [ShipType.Hauler] = 1 }, cargo);

    [Fact]
    public void ViewShowsOwnFleetsWithTheirTimes()
    {
        var state = Sent(100);
        var view = Engine.ViewFor(state, Me, 200).Fleets.Single();
        Assert.Equal((100, 100 + Prep, state.Fleets[0].ArriveAt), (view.LaunchAt, view.DepartAt, view.ArriveAt));
        Assert.Equal(Side.Team, view.Side);
        Assert.Empty(Engine.ViewFor(state, new PlayerId("other"), 200).Fleets);
    }

    [Fact]
    public void FleetStateRoundTripsThroughJson()
    {
        var state = Sent();
        var json = JsonSerializer.Serialize(state);
        Assert.Equal(json, JsonSerializer.Serialize(JsonSerializer.Deserialize<GameState>(json)));
        Assert.Single(JsonSerializer.Deserialize<GameState>(json)!.Fleets);
    }
}
