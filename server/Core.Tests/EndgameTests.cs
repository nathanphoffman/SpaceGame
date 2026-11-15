using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class EndgameTests
{
    private const long Hour = 3600;
    private static readonly PlanetId Objective = FleetGame().Objectives[0];

    private static GameState WithScores(int team, int enemy) => FleetGame() with { TeamScore = team, EnemyScore = enemy };

    private static GameState TeamHolds(GameState state) =>
        state.WithPlayer(state.PlayerById(Me)! is var p ? p with { Holdings = [.. p.Holdings, new Holding(Objective)] } : p);

    private static GameEvent Ended(IReadOnlyList<GameEvent> events) => Assert.Single(events, e => e.Kind == "GameEnded");

    private static Fleet ColonyAt(PlanetId planet) =>
        new(new FleetId("x1"), Me, StartingKit.EarthId, planet, 0, 0, 0,
            new Dictionary<ShipType, int> { [ShipType.Colony] = 1 }, Resources.Zero, Parked: true, Side: Side.Team);

    [Fact]
    public void ReachingTheScoreTargetEndsTheGame()
    {
        var (state, events) = Engine.Advance(TeamHolds(WithScores(499, 0)), Hour + 1, new SeqDice());
        var ended = Ended(events);
        Assert.Equal("Team", ended.Data["winner"]);
        Assert.Equal("score", ended.Data["reason"]);
        Assert.Equal("500", ended.Data["teamScore"]);
        Assert.Equal(Side.Team, state.Outcome!.Winner);
    }

    [Fact]
    public void EnemyReachingTheTargetWins()
    {
        var (_, events) = Engine.Advance(WithScores(0, 500), 1, new SeqDice());
        Assert.DoesNotContain(events, e => e.Kind == "GameEnded");
        var state = WithScores(0, 499) with { EnemyPlanets = [.. FleetGame().EnemyPlanets, Objective] };
        Assert.Equal("Enemy", Ended(Engine.Advance(state, Hour, new SeqDice()).Events).Data["winner"]);
    }

    [Fact]
    public void ContributionsListEachPlayersPoints()
    {
        var (_, events) = Engine.Advance(TeamHolds(WithScores(498, 0)), 2 * Hour, new SeqDice());
        var list = JsonDocument.Parse(Ended(events).Data["contributions"]).RootElement;
        Assert.Equal("p1", list[0].GetProperty("player").GetString());
        Assert.Equal(2, list[0].GetProperty("points").GetInt32());
    }

    [Fact]
    public void WeekEndsWithTheHigherScoreWinning()
    {
        var config = FleetGame().Config;
        var (state, events) = Engine.Advance(WithScores(5, 3), config.WeekSeconds + 50, new SeqDice());
        var ended = Ended(events);
        Assert.Equal(("Team", "time"), (ended.Data["winner"], ended.Data["reason"]));
        Assert.Equal(config.WeekSeconds, ended.Time);
        Assert.Equal(config.WeekSeconds, state.Outcome!.At);
    }

    [Fact]
    public void ATieAtTheEndOfTheWeekGoesToTheEnemy()
    {
        var (_, events) = Engine.Advance(WithScores(4, 4), FleetGame().Config.WeekSeconds, new SeqDice());
        Assert.Equal("Enemy", Ended(events).Data["winner"]);
    }

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
