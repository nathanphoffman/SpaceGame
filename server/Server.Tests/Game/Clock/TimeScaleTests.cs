using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class TimeScaleTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData("week", 90, 90)]
    [InlineData("test", 3_600, 604_800)]
    [InlineData("week", 9 * 86_400, 604_800)]
    [InlineData("week", -5, 0)]
    public void Game_time_follows_mode_and_is_clamped(string mode, int realSeconds, long expected) =>
        Assert.Equal(expected, TimeScale.GameTime(Start, Start.AddSeconds(realSeconds), mode, 604_800));
}
