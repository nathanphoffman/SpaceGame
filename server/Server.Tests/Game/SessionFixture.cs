using SpaceGame.Core;
using SpaceGame.Server.Discord;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

/// <summary>Builds a GameSession over a stored game with a fake clock already 60 seconds past the start.</summary>
public static class SessionFixture
{
    private const int SecondsPassed = 60;

    public static GameSession Build(StoredGame stored, IGameEngine engine, DiscordNotifier discord)
    {
        var clock = new FakeClock(StoredGame.StartTime);
        clock.Advance(TimeSpan.FromSeconds(SecondsPassed));

        return new GameSession(stored.Repo, stored.Writer, engine, clock, new GameLocks(), new NullGameNotifier(), discord);
    }
}
