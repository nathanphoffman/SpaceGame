using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;
using static SpaceGame.Core.Tests.EndgameFixture;

namespace SpaceGame.Core.Tests;

public class EndgameScoreTests
{
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
}
