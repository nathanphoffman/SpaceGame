namespace SpaceGame.Server.Tests;

public sealed class FakeClock(DateTimeOffset start) : IClock
{
    public DateTimeOffset UtcNow { get; private set; } = start;

    public void MoveForward(TimeSpan by) => UtcNow += by;
}
