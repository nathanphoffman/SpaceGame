namespace SpaceGame.Server;

/// <summary>Source of the current wall-clock time. Injected so tests can control it.</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
