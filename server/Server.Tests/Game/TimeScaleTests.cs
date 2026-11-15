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
    public void Same_seed_and_time_give_the_same_dice()
    {
        var a = new SeededDice(5, 100);
        var b = new SeededDice(5, 100);
        Assert.Equal(Enumerable.Range(0, 20).Select(_ => a.Roll()), Enumerable.Range(0, 20).Select(_ => b.Roll()));
    }
}
