using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class FleetBattleTests
{
    private static readonly PlayerId EnemyId = new("enemy");

    private sealed class FixedDice(int roll) : IDice
    {
        public int Roll() => roll;
    }

    private static Fleet EnemyParked(int fighters, PlanetId planet) =>
        new(new FleetId("e1"), EnemyId, planet, planet, 0, 0, 0,
            new Dictionary<ShipType, int> { [ShipType.Fighter] = fighters }, Resources.Zero, Parked: true, Side: Side.Enemy);

    private static Fleet EnemyArriving(int fighters, PlanetId to, long arriveAt) =>
        new(new FleetId("e2"), EnemyId, Target, to, 0, 0, arriveAt,
            new Dictionary<ShipType, int> { [ShipType.Fighter] = fighters }, Resources.Zero, Side: Side.Enemy);

    [Fact]
    public void TeamFleetBeatsWeakerParkedEnemy()
    {
        var state = Sent() with { };
        state = state with { Fleets = [.. state.Fleets, EnemyParked(1, Target)] };
        var (after, events) = Engine.Advance(state, state.Fleets[0].ArriveAt, new FixedDice(6));
        var battle = Assert.Single(events, e => e.Kind == "BattleResolved");
        Assert.Equal("true", battle.Data["attackersWon"]);
        Assert.Equal(Target.Value, battle.Data["planet"]);
        var left = Assert.Single(after.Fleets);
        Assert.Equal(Side.Team, left.Side);
    }

    [Fact]
    public void LosingTeamFleetIsDestroyed()
    {
        var state = Sent();
        state = state with { Fleets = [.. state.Fleets, EnemyParked(5, Target)] };
        var (after, _) = Engine.Advance(state, state.Fleets[0].ArriveAt, new FixedDice(6));
        Assert.All(after.Fleets, f => Assert.Equal(Side.Enemy, f.Side));
    }

    [Fact]
    public void EnemyArrivingAtEarthFightsTheHomeShips()
    {
        var state = FleetGame();
        state = state with { Fleets = [EnemyArriving(1, StartingKit.EarthId, 100)] };
        var (after, events) = Engine.Advance(state, 100, new FixedDice(6));
        Assert.Equal("false", Assert.Single(events, e => e.Kind == "BattleResolved").Data["attackersWon"]);
        Assert.Empty(after.Fleets);
        Assert.Equal(4, FightersHome(after)); // the unarmed Scout soaked the only hit
    }

    [Fact]
    public void EnemyWinningAtEarthParksThere()
    {
        var state = FleetGame();
        state = state with { Fleets = [EnemyArriving(20, StartingKit.EarthId, 100)] };
        var (after, events) = Engine.Advance(state, 100, new FixedDice(6));
        Assert.Equal("true", Assert.Single(events, e => e.Kind == "BattleResolved").Data["attackersWon"]);
        Assert.Equal(0, FightersHome(after));
        Assert.True(Assert.Single(after.Fleets).Parked);
    }

    [Fact]
    public void DefenseBuildingLowersTheDefendersRoll()
    {
        var state = FleetGame();
        var player = state.PlayerById(Me)!;
        var defended = state.WithPlayer(player.WithHolding(player.HoldingAt(StartingKit.EarthId)! with { HasDefense = true }));

        // Fighters hit on 5; with the bonus the defenders hit on 4, so a roll of 4 kills the lone attacker.
        var arriving = defended with { Fleets = [EnemyArriving(1, StartingKit.EarthId, 100)] };
        var (after, _) = Engine.Advance(arriving, 100, new FixedDice(4));
        Assert.Empty(after.Fleets);
    }
}
