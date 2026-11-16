using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

public class GameClockOptionsTests
{
    [Theory]
    [InlineData(null, 5)]
    [InlineData(0, 1)]
    public void Tick_defaults_to_five_seconds_and_is_never_shorter_than_one(int? tickSeconds, int expected)
    {
        var options = tickSeconds is { } seconds ? new GameClockOptions { TickSeconds = seconds } : new GameClockOptions();
        Assert.Equal(TimeSpan.FromSeconds(expected), options.Interval);
    }

    [Theory]
    [InlineData("week", 1)]
    [InlineData("test", 168)]
    public void Scale_depends_on_mode(string mode, int expected) => Assert.Equal(expected, TimeScale.For(mode));
}
