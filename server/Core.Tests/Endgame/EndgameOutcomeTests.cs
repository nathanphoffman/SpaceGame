using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;
using static SpaceGame.Core.Tests.EndgameFixture;

namespace SpaceGame.Core.Tests;

public class EndgameOutcomeTests
{
    [Fact]
    public void ClaimingTheEnemyHomeWinsAtOnce()
    {
        var home = FleetGame().EnemyHome!.Value;
        var (state, result) = Do(FleetGame() with { Fleets = [ColonyAt(home)] }, new Colonize(home), 100);
        Assert.True(result.Ok);
        Assert.Equal("homeCaptured", state.Outcome!.Reason);
        var (_, events) = Engine.Advance(state, 200, new SeqDice());
        Assert.Equal("Team", Ended(events).Data["winner"]);
    }

    [Fact]
    public void EnemyWinningABattleAtEarthEndsTheGame()
    {
        var earth = FleetGame().PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!;
        var bare = FleetGame().WithPlayer(FleetGame().PlayerById(Me)! with { Holdings = [earth with { Ships = new Dictionary<ShipType, int> { [ShipType.Scout] = 1 } }] });
        var raid = new Fleet(new FleetId("e1"), EnemyConfig.Owner, FleetGame().EnemyHome!.Value, StartingKit.EarthId, 0, 0, 10,
            new Dictionary<ShipType, int> { [ShipType.Dreadnought] = 5 }, Resources.Zero, Side: Side.Enemy);
        var (state, events) = Engine.Advance(bare with { Fleets = [raid] }, 20, new SeqDice());
        var ended = Ended(events);
        Assert.Equal(("Enemy", "earthLost"), (ended.Data["winner"], ended.Data["reason"]));
        Assert.Equal(10, ended.Time);
        Assert.NotNull(state.Outcome);
    }

    [Fact]
    public void NothingHappensAfterTheEnd()
    {
        var (ended, _) = Engine.Advance(TeamHolds(WithScores(499, 0)), Hour, new SeqDice());
        var (again, events) = Engine.Advance(ended, 5 * Hour, new SeqDice());
        Assert.Empty(events);
        Assert.Equal(ended, again);
        var (_, result) = Do(ended, Send(), Hour + 20);
        Assert.False(result.Ok);
    }

    [Fact]
    public void TheEndedStateRoundTripsThroughJson()
    {
        var (ended, _) = Engine.Advance(TeamHolds(WithScores(499, 0)), Hour, new SeqDice());
        var back = JsonSerializer.Deserialize<GameState>(JsonSerializer.Serialize(ended))!;
        Assert.Equal(ended.Outcome, back.Outcome);
        Assert.Equal(1, back.PlayerById(Me)!.Points);
    }
}
