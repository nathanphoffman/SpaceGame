using SpaceGame.Core;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameSessionTests
{
    private static GameSession NewSession(StoredGame stored, FakeClock clock, FakeEngine engine) =>
        new(stored.Repo, stored.Writer, engine, clock, new GameLocks(), new NullGameNotifier(), new NoDiscord());

    [PostgresFact]
    public async Task Advances_to_the_game_time_and_saves()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.Advance(TimeSpan.FromSeconds(120));
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
        clock.Advance(TimeSpan.FromMinutes(30));
        Assert.Equal(302_400, (await session.AdvanceAsync(stored.GameId))!.GameTime);
    }

    [PostgresFact]
    public async Task Test_mode_game_reaches_week_end_after_one_hour_and_stays_there()
    {
        var stored = await StoredGame.CreateAsync(mode: "test", status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.Advance(TimeSpan.FromHours(1));
        Assert.Equal(StoredGame.EmptyState.Config.WeekSeconds, (await session.AdvanceAsync(stored.GameId))!.GameTime);
        clock.Advance(TimeSpan.FromHours(1));
        Assert.Equal(StoredGame.EmptyState.Config.WeekSeconds, (await session.AdvanceAsync(stored.GameId))!.GameTime);
    }

    [PostgresFact]
    public async Task A_game_in_the_lobby_is_not_advanced()
    {
        var stored = await StoredGame.CreateAsync();
        var clock = new FakeClock(StoredGame.StartTime);
        var engine = new FakeEngine();
        var session = NewSession(stored, clock, engine);
        clock.Advance(TimeSpan.FromHours(1));
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

    [PostgresFact]
    public async Task Mutate_saves_the_changed_state()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.Advance(TimeSpan.FromSeconds(10));
        await session.MutateAsync<int>(stored.GameId, (state, _) => (state with { Config = state.Config with { ScoreTarget = 7 } }, 1));
        Assert.Equal(7, (await stored.Repo.LoadAsync(stored.GameId))!.State.Config.ScoreTarget);
    }

    [PostgresFact]
    public async Task Parallel_requests_do_not_conflict()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.Advance(TimeSpan.FromSeconds(10));
        var tasks = Enumerable.Range(0, 8).Select(_ => session.AdvanceAsync(stored.GameId)).ToArray();
        await Task.WhenAll(tasks);
        Assert.All(tasks, task => Assert.NotNull(task.Result));
    }

    [PostgresFact]
    public async Task Battle_events_are_stored_as_reports()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine { EventKind = "BattleResolved" });
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(stored.GameId);
        var reports = await stored.Repo.ReportsAsync(stored.GameId);
        Assert.Single(reports);
        Assert.Equal(30, reports[0].GameTime);
    }

    [PostgresFact]
    public async Task Other_events_store_no_report()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine());
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(stored.GameId);
        Assert.Empty(await stored.Repo.ReportsAsync(stored.GameId));
    }

    [PostgresFact]
    public async Task A_game_end_event_saves_the_game_as_finished()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine { EventKind = EventNotifications.GameEndedKind });
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(stored.GameId);
        Assert.Equal("finished", (await stored.Repo.LoadAsync(stored.GameId))!.Status);
    }

    [PostgresFact]
    public async Task A_command_in_the_tick_that_ends_the_game_is_not_applied()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var clock = new FakeClock(StoredGame.StartTime);
        var session = NewSession(stored, clock, new FakeEngine { EventKind = EventNotifications.GameEndedKind });
        clock.Advance(TimeSpan.FromSeconds(30));
        var snapshot = await session.MutateAsync<int>(stored.GameId, (state, _) => (state with { Config = state.Config with { ScoreTarget = 7 } }, 1));
        Assert.Equal("finished", snapshot!.Game.Status);
        Assert.NotEqual(7, (await stored.Repo.LoadAsync(stored.GameId))!.State.Config.ScoreTarget);
    }

    [PostgresFact]
    public async Task A_finished_game_is_not_advanced_or_changed()
    {
        var stored = await StoredGame.CreateAsync(status: "finished");
        var clock = new FakeClock(StoredGame.StartTime);
        var engine = new FakeEngine();
        var session = NewSession(stored, clock, engine);
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(stored.GameId);
        Assert.Equal(0, engine.AdvanceCalls);
    }
}
