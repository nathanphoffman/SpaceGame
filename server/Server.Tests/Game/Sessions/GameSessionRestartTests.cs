using Microsoft.Extensions.Logging.Abstractions;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameSessionRestartTests
{
    private const int FirstAdvanceSeconds = 30;
    private const int SecondAdvanceSeconds = 90;

    private static GameSession NewSession(GameRepository repo, GameWriter writer, FakeClock clock, FakeEngine engine) =>
        new(repo, writer, engine, clock, new GameLocks(), new NullGameNotifier(), new NoDiscord(), NullLogger<GameSession>.Instance);

    [PostgresFact]
    public async Task A_new_session_on_the_same_database_carries_on_from_the_saved_game()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var before = NewSession(stored.Repo, stored.Writer, clock, new FakeEngine { EventKind = "BattleResolved" });
        clock.MoveForward(TimeSpan.FromSeconds(FirstAdvanceSeconds));
        var saved = await before.AdvanceAsync(stored.GameId);

        // Restart: a new database context, writer, session and lock table. Nothing is cached.
        var db = TestDatabase.NewContext(stored.Schema);
        var engine = new FakeEngine { EventKind = "BattleResolved" };
        var after = NewSession(new GameRepository(db), new GameWriter(db), clock, engine);
        var loaded = await new GameRepository(db).LoadAsync(stored.GameId);
        clock.MoveForward(TimeSpan.FromSeconds(SecondAdvanceSeconds - FirstAdvanceSeconds));
        var resumed = await after.AdvanceAsync(stored.GameId);

        Assert.Equal(saved!.Game.Version, loaded!.Version);
        Assert.Equal(FirstAdvanceSeconds, loaded.State.Time);
        Assert.Equal(SecondAdvanceSeconds, resumed!.Game.State.Time);
        Assert.Equal(saved.Game.Version + 1, resumed.Game.Version);
        Assert.Equal([FirstAdvanceSeconds, SecondAdvanceSeconds], (await stored.Repo.ReportsAsync(stored.GameId)).Select(r => r.GameTime).Order());
    }
}
