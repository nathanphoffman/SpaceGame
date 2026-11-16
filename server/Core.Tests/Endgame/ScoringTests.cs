using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class ScoringTests
{
    private const long Hour = 3600;
    private static readonly PlanetId Objective = FleetGame().Objectives[0];

    private static GameState TeamHolds() =>
        FleetGame().WithPlayer(FleetGame().PlayerById(Me)! is var p ? p with { Holdings = [.. p.Holdings, new Holding(Objective)] } : p);

    private static GameState EnemyHolds() => FleetGame() with { EnemyPlanets = [.. FleetGame().EnemyPlanets, Objective] };

    [Fact]
    public void NothingHeldScoresNothing()
    {
        var (state, events) = Engine.Advance(FleetGame(), 5 * Hour, new SeqDice());
        Assert.Equal((0, 0), (state.TeamScore, state.EnemyScore));
        Assert.DoesNotContain(events, e => e.Kind == TestNames.ScoreChanged);
    }

    [Theory]
    [InlineData(true, 3, 0)]
    [InlineData(false, 0, 2)]
    public void EachSideScoresOnePerHourPerObjective(bool teamHolds, int teamScore, int enemyScore)
    {
        var start = teamHolds ? TeamHolds() : EnemyHolds();
        var (state, events) = Engine.Advance(start, 3 * Hour + 10 - (teamHolds ? 0 : Hour + 10), new SeqDice());
        Assert.Equal((teamScore, enemyScore), (state.TeamScore, state.EnemyScore));
        Assert.Equal(teamScore + enemyScore, events.Count(e => e.Kind == TestNames.ScoreChanged));
    }

    [Fact]
    public void HoursAreNotScoredTwice()
    {
        var first = Engine.Advance(TeamHolds(), 2 * Hour, new SeqDice()).State;
        var second = Engine.Advance(first, 2 * Hour + 100, new SeqDice()).State;
        Assert.Equal(2, second.TeamScore);
    }

    [Fact]
    public void ColonizingAnObjectiveScoresACapturePoint()
    {
        var fleet = new Fleet(new FleetId("x1"), Me, StartingKit.EarthId, Objective, 0, 0, 0,
            new Dictionary<ShipType, int> { [ShipType.Colony] = 1 }, Resources.Zero, Parked: true, Side: Side.Team);
        var (claimed, result) = Do(FleetGame() with { Fleets = [fleet] }, new Colonize(Objective), 100);
        Assert.True(result.Ok);
        Assert.Equal(1, claimed.TeamScore);

        var (_, events) = Engine.Advance(claimed, 200, new SeqDice());
        var captured = Assert.Single(events, e => e.Kind == "PlanetCaptured");
        Assert.Equal("Team", captured.Data["side"]);
        Assert.Contains(events, e => e.Kind == TestNames.ScoreChanged);
    }

    [Fact]
    public void CapturingANormalPlanetScoresNothing()
    {
        var other = FleetGame().Planets.First(p => !FleetGame().Objectives.Contains(p.Id)).Id;
        var captured = Scoring.Capture(FleetGame(), Side.Enemy, other, 50);
        Assert.Equal(0, captured.EnemyScore);
        Assert.Single(captured.PendingEvents);
    }

    [Fact]
    public void ScoresShowInThePlayerView()
    {
        var (state, _) = Engine.Advance(TeamHolds(), 2 * Hour, new SeqDice());
        Assert.Equal(2, Engine.ViewFor(state, Me, 2 * Hour).TeamScore);
    }

    [Fact]
    public void ScoresRoundTripThroughJson()
    {
        var (state, _) = Engine.Advance(TeamHolds(), 2 * Hour, new SeqDice());
        var scored = Scoring.Capture(state, Side.Enemy, Objective, 9);
        var back = JsonSerializer.Deserialize<GameState>(JsonSerializer.Serialize(scored))!;
        Assert.Equal((scored.TeamScore, scored.EnemyScore, scored.HoursScored), (back.TeamScore, back.EnemyScore, back.HoursScored));
        Assert.Equal(scored.PendingEvents.Count, back.PendingEvents.Count);
    }
}
