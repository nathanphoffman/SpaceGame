namespace SpaceGame.Server.Tests;

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
