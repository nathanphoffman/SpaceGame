using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class FullWeekTests
{
    private const long Hour = 3600;
    private const int Seed = 7;
    private const int RollsPerDie = 6;
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    /// <summary>Same seed gives the same rolls; a tiny generator so the test needs no other project.</summary>
    private sealed class CountingDice(int seed) : IDice
    {
        private int _next = seed;

        public int Roll()
        {
            _next = unchecked(_next * 1103515245 + 12345);

            return (int)((uint)_next >> 16) % RollsPerDie + 1;
        }
    }

    private static (GameState State, List<GameEvent> Events) SimulateIdleWeek(int seed)
    {
        var setup = new GameSetup(seed, [new PlayerSetup(new PlayerId("p1"), "Ann")], new GameConfig());
        var state = Engine.NewGame(setup);
        var dice = new CountingDice(seed);
        var events = new List<GameEvent>();

        for (var hour = 1L; hour <= setup.Config.WeekSeconds / Hour + 1; hour++)
        {
            var step = Engine.Advance(state, hour * Hour, dice);
            state = step.State;
            events.AddRange(step.Events);
        }

        return (state, events);
    }

    [Fact]
    public void IdleWeekEndsTheGame()
    {
        var (state, events) = SimulateIdleWeek(Seed);

        Assert.NotNull(state.Outcome);
        Assert.Single(events, e => e.Kind == "GameEnded");
    }

    [Fact]
    public void EnemyAttackOnEarthComesOnSchedule()
    {
        var (state, _) = SimulateIdleWeek(Seed);

        Assert.NotEmpty(state.EnemyPlanets);
        Assert.True(state.EarthAttacksSent >= 1);
    }

    [Fact]
    public void SameSeedGivesTheSameWeek()
    {
        var first = SimulateIdleWeek(Seed);
        var second = SimulateIdleWeek(Seed);

        Assert.Equal(JsonSerializer.Serialize(first.State), JsonSerializer.Serialize(second.State));
        Assert.Equal(JsonSerializer.Serialize(first.Events), JsonSerializer.Serialize(second.Events));
    }
}
