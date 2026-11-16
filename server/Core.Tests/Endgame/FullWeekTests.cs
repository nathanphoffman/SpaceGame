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

    [Fact]
    public void IdleWeekEndsTheGame()
    {
        var setup = new GameSetup(Seed, [new PlayerSetup(new PlayerId("p1"), TestNames.Ann)], new GameConfig());
        var (state, events) = Engine.Advance(Engine.NewGame(setup), setup.Config.WeekSeconds + Hour, new CountingDice(Seed));

        Assert.NotNull(state.Outcome);
        Assert.Single(events, e => e.Kind == EventNames.GameEnded);
    }

    [Fact]
    public void EnemyAttackOnEarthComesOnSchedule()
    {
        var setup = new GameSetup(Seed, [new PlayerSetup(new PlayerId("p1"), TestNames.Ann)], new GameConfig());
        var (state, _) = Engine.Advance(Engine.NewGame(setup), setup.Config.WeekSeconds + Hour, new CountingDice(Seed));

        Assert.NotEmpty(state.EnemyPlanets);
        Assert.True(state.EarthAttacksSent >= 1);
    }

    [Fact]
    public void SameSeedGivesTheSameWeek()
    {
        var setupA = new GameSetup(Seed, [new PlayerSetup(new PlayerId("p1"), TestNames.Ann)], new GameConfig());
        var first = Engine.Advance(Engine.NewGame(setupA), setupA.Config.WeekSeconds + Hour, new CountingDice(Seed));
        var second = Engine.Advance(Engine.NewGame(setupA), setupA.Config.WeekSeconds + Hour, new CountingDice(Seed));

        Assert.Equal(JsonSerializer.Serialize(first.State), JsonSerializer.Serialize(second.State));
        Assert.Equal(JsonSerializer.Serialize(first.Events), JsonSerializer.Serialize(second.Events));
    }
}
