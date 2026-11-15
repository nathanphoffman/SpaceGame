using Microsoft.Extensions.Logging.Abstractions;
using SpaceGame.Core;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameSessionTests
{
    private static GameSession NewSession(StoredGame stored, FakeClock clock, FakeEngine engine) =>
        new(stored.Repo, stored.Writer, engine, clock, new GameLocks(), new NullGameNotifier(), new NoDiscord(), NullLogger<GameSession>.Instance);

    [PostgresFact]

    public async Task Advances_to_the_game_time_and_saves()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.MoveForward(TimeSpan.FromSeconds(120));
        var snapshot = await session.AdvanceAsync(stored.GameId);
        Assert.Equal(120, snapshot!.GameTime);
        Assert.Single(snapshot.Events);
        Assert.Equal(120, (await stored.Repo.LoadAsync(stored.GameId))!.State.Time);
        Assert.Equal(2, snapshot.Game.Version);
    }

    [PostgresFact]
    public async Task Test_mode_runs_168_times_faster()
    {
        var stored = await StoredGame.CreateAsync(mode: "test", status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.MoveForward(TimeSpan.FromMinutes(30));
        Assert.Equal(302_400, (await session.AdvanceAsync(stored.GameId))!.GameTime);
    }

    [PostgresFact]
    public async Task Test_mode_game_reaches_week_end_after_one_hour_and_stays_there()
    {
        var stored = await StoredGame.CreateAsync(mode: "test", status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.MoveForward(TimeSpan.FromHours(1));
        Assert.Equal(StoredGame.EmptyState.Config.WeekSeconds, (await session.AdvanceAsync(stored.GameId))!.GameTime);
        clock.MoveForward(TimeSpan.FromHours(1));
        Assert.Equal(StoredGame.EmptyState.Config.WeekSeconds, (await session.AdvanceAsync(stored.GameId))!.GameTime);
    }

    [PostgresFact]
    public async Task A_game_in_the_lobby_is_not_advanced()
    {
        var stored = await StoredGame.CreateAsync();
        var clock = new FakeClock(StoredGame.StartTime);
        var engine = new FakeEngine();
        var session = NewSession(stored, clock, engine);
        clock.MoveForward(TimeSpan.FromHours(1));
        var snapshot = await session.AdvanceAsync(stored.GameId);
        Assert.Equal(0, snapshot!.GameTime);
        Assert.Equal(0, engine.AdvanceCalls);
    }

    [PostgresFact]
    public async Task Unknown_game_gives_null()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var session = NewSession(stored, new FakeClock(StoredGame.StartTime), new FakeEngine());
        Assert.Null(await session.AdvanceAsync(Guid.NewGuid()));
    }
}
