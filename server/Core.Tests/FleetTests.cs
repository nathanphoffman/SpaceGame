using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class FleetTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly IGameEngine Engine = GameEngineFactory.Create();
    private static readonly PlanetId Target = StarCatalog.Systems.Skip(1).MinBy(s => s.LightYears)!.Planets[0].Id;
    private const long Prep = 300;

    private static GameState New() =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(Me, "Ann")], new GameConfig()));

    private static SendFleet Send(int fighters = 2, Resources? cargo = null, int haulers = 0)
    {
        var ships = new Dictionary<ShipType, int> { [ShipType.Fighter] = fighters };

        if (haulers > 0) ships[ShipType.Hauler] = haulers;

        return new(StartingKit.EarthId, ships, Target, cargo);
    }

    private static (GameState State, CommandResult Result) Do(GameState s, GameCommand c, long now = 0) =>
        Engine.Apply(s, Me, c, now);

    private static GameState Sent(long now = 0) => Do(New(), Send(), now).State;

    private static int FightersHome(GameState s) =>
        s.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!.Ships.GetValueOrDefault(ShipType.Fighter);

    [Fact]
    public void SendTakesTheShipsAndAddsAFleetWithPrepAndFlight()
    {
        var quote = Engine.Quote(New(), Me, Send(), 100);
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
        Assert.Equal(error, Do(New(), Send(fighters)).Result.Error);
    }

    [Fact]
    public void SendingToTheSamePlanetIsRejected()
    {
        var send = Send() with { To = StartingKit.EarthId };
        Assert.Equal("Choose a different destination.", Do(New(), send).Result.Error);
    }

    [Fact]
    public void CargoNeedsHaulerCapacityAndStock()
    {
        Assert.Equal("Your Haulers cannot carry that much.", Do(New(), Send(cargo: new Resources(10, 0, 0, 0))).Result.Error);
        var state = Do(New(), new QueueShip(StartingKit.EarthId, ShipType.Hauler, 1)).State;
        state = Engine.Advance(state, 3600, new SeqDice()).State;
        Assert.Equal("You do not have that cargo in your stockpile.",
            Do(state, Send(0, new Resources(0, 0, 0, 50), 1), 3600).Result.Error);
    }

    [Fact]
    public void CargoLeavesTheStockpileAndUnloadsAtHomeOnArrivalThere()
    {
        var state = Do(New(), new QueueShip(StartingKit.EarthId, ShipType.Hauler, 1)).State;
        state = Engine.Advance(state, 3600, new SeqDice()).State;
        var before = state.PlayerById(Me)!.Stock.AdvanceTo(3600, Economy.RatePerHourMilli(state, state.PlayerById(Me)!)).Amount;
        var sent = Do(state, Send(0, new Resources(0, 50, 0, 0), 1), 3600).State;
        Assert.Equal(before.Hydrogen - 50, sent.PlayerById(Me)!.Stock.Amount.Hydrogen);
        Assert.Equal(50, Assert.Single(sent.Fleets).Cargo.Hydrogen);
    }

    [Fact]
    public void AdvanceMovesNothingBeforeArrival()
    {
        var state = Sent();
        var (after, events) = Engine.Advance(state, state.Fleets[0].ArriveAt - 1, new SeqDice());
        Assert.Single(after.Fleets);
        Assert.Empty(events);
    }

    [Fact]
    public void ArrivalWithoutABaseParksTheFleetAndReportsIt()
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
    public void RecallDuringPrepReturnsTheShipsAtOnce()
    {
        var state = Sent();
        var (after, r) = Do(state, new RecallFleet(state.Fleets[0].Id), Prep - 1);
        Assert.True(r.Ok);
        Assert.Empty(after.Fleets);
        Assert.Equal(4, FightersHome(after));
    }

    [Fact]
    public void RecallInFlightFliesBackForTheTimeAlreadyFlown()
    {
        var state = Sent();
        var flown = 1000;
        var (after, r) = Do(state, new RecallFleet(state.Fleets[0].Id), Prep + flown);
        var back = Assert.Single(after.Fleets);
        Assert.True(r.Ok);
        Assert.True(back.Returning);
        Assert.Equal(Target, back.From);
        Assert.Equal(StartingKit.EarthId, back.To);
        Assert.Equal(Prep + flown + flown, back.ArriveAt);
    }

    [Fact]
    public void ReturningFleetJoinsTheBaseAgain()
    {
        var state = Sent();
        var recalled = Do(state, new RecallFleet(state.Fleets[0].Id), Prep + 1000).State;
        var done = Engine.Advance(recalled, Prep + 2000, new SeqDice()).State;
        Assert.Empty(done.Fleets);
        Assert.Equal(4, FightersHome(done));
    }

    [Fact]
    public void RecallFailsForUnknownArrivedOrReturningFleets()
    {
        var state = Sent();
        var id = state.Fleets[0].Id;
        Assert.False(Do(state, new RecallFleet(new FleetId("nope"))).Result.Ok);
        Assert.False(Do(state, new RecallFleet(id), state.Fleets[0].ArriveAt).Result.Ok);
        var back = Do(state, new RecallFleet(id), Prep + 10).State;
        Assert.Equal("That fleet is already returning.", Do(back, new RecallFleet(id), Prep + 11).Result.Error);
    }

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

    private sealed class SeqDice : IDice
    {
        public int Roll() => 3;
    }
}
