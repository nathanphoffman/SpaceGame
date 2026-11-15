using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class FleetRecallTests
{
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
        var fleetId = state.Fleets[0].Id;
        Assert.False(Do(state, new RecallFleet(new FleetId("nope"))).Result.Ok);
        Assert.False(Do(state, new RecallFleet(fleetId), state.Fleets[0].ArriveAt).Result.Ok);
        var back = Do(state, new RecallFleet(fleetId), Prep + 10).State;
        Assert.Equal("That fleet is already returning.", Do(back, new RecallFleet(fleetId), Prep + 11).Result.Error);
    }
}
