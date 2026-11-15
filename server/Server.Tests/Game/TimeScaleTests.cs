using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class TimeScaleTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Week_mode_is_real_time() =>
        Assert.Equal(90, TimeScale.GameTime(Start, Start.AddSeconds(90), "week", 604_800));

    [Fact]
    public void Test_mode_runs_a_week_in_one_hour() =>
        Assert.Equal(604_800, TimeScale.GameTime(Start, Start.AddHours(1), "test", 604_800));

    [Fact]
    public void Game_time_stops_at_the_end_of_the_game() =>
        Assert.Equal(604_800, TimeScale.GameTime(Start, Start.AddDays(9), "week", 604_800));

    [Fact]
    public void Game_time_is_never_negative() =>
        Assert.Equal(0, TimeScale.GameTime(Start, Start.AddSeconds(-5), "week", 604_800));

    [Fact]
    public void Same_seed_with_same_time_give_the_same_dice()
    {
        var first = new SeededDice(5, 100);
        var second = new SeededDice(5, 100);
        Assert.Equal(Enumerable.Range(0, 20).Select(_ => first.Roll()), Enumerable.Range(0, 20).Select(_ => second.Roll()));
    }
}

public class GameClockOptionsTests
{
    [Fact]
    public void Tick_defaults_to_five_seconds()
    {
        Assert.Equal(TimeSpan.FromSeconds(5), new SpaceGame.Server.Game.GameClockOptions().Interval);
    }

    [Fact]
    public void Tick_is_never_shorter_than_one_second()
    {
        Assert.Equal(TimeSpan.FromSeconds(1), new SpaceGame.Server.Game.GameClockOptions { TickSeconds = 0 }.Interval);
    }

    [Fact]
    public void Scale_is_1_in_week_mode_and_168_in_test_mode()
    {
        Assert.Equal(1, SpaceGame.Server.Game.TimeScale.For("week"));
        Assert.Equal(168, SpaceGame.Server.Game.TimeScale.For("test"));
    }
}
