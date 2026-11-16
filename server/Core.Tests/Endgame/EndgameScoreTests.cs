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
        Assert.Equal("Team", ended.Data[TestNames.Winner]);
        Assert.Equal("score", ended.Data[TestNames.Reason]);
        Assert.Equal("500", ended.Data["teamScore"]);
        Assert.Equal(Side.Team, state.Outcome!.Winner);
    }

    [Fact]
    public void EnemyReachingTheTargetWins()
    {
        var (_, events) = Engine.Advance(WithScores(0, 500), 1, new SeqDice());
        Assert.DoesNotContain(events, e => e.Kind == EventNames.GameEnded);
        var state = WithScores(0, 499) with { EnemyPlanets = [.. FleetGame().EnemyPlanets, Objective] };
        Assert.Equal("Enemy", Ended(Engine.Advance(state, Hour, new SeqDice()).Events).Data[TestNames.Winner]);
    }

    [Fact]
    public void ContributionsListEachPlayersPoints()
    {
        var (_, events) = Engine.Advance(TeamHolds(WithScores(498, 0)), 2 * Hour, new SeqDice());
        var list = JsonDocument.Parse(Ended(events).Data["contributions"]).RootElement;
        Assert.Equal("p1", list[0].GetProperty("player").GetString());
        Assert.Equal(2, list[0].GetProperty("points").GetInt32());
    }

    [Theory]
    [InlineData(5, 3, "Team")]
    [InlineData(4, 4, "Enemy")] // a tie goes to the enemy
    public void WeekEndsWithTheHigherScoreWinning(int team, int enemy, string winner)
    {
        var config = FleetGame().Config;
        var (state, events) = Engine.Advance(WithScores(team, enemy), config.WeekSeconds + 50, new SeqDice());
        var ended = Ended(events);
        Assert.Equal((winner, "time"), (ended.Data[TestNames.Winner], ended.Data[TestNames.Reason]));
        Assert.Equal(config.WeekSeconds, ended.Time);
        Assert.Equal(config.WeekSeconds, state.Outcome!.At);
    }
}
