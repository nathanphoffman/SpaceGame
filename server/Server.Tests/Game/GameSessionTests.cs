using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameSessionTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private static async Task<(GameSession Session, GameRepository Repo, FakeClock Clock, FakeEngine Engine, Guid Id)> SetupAsync(
        string mode, string status = "running")
    {
        var schema = await TestDatabase.MigratedSchemaAsync();
        var repo = new GameRepository(TestDatabase.NewContext(schema));
        var clock = new FakeClock(Start);
        var engine = new FakeEngine();
        var row = await repo.CreateAsync("ABCD", mode, 1, new GameState(new GameConfig(), 0), null, Start);
        await repo.SaveAsync(row.Id, new GameState(new GameConfig(), 0), status, 0, Start, Start);

        return (new GameSession(repo, engine, clock, new GameLocks(), new NullGameNotifier(), new NoDiscord()), repo, clock, engine, row.Id);
    }

    [PostgresFact]
    public async Task Advances_to_the_game_time_and_saves()
    {
        var (session, repo, clock, _, id) = await SetupAsync("week");
        clock.Advance(TimeSpan.FromSeconds(120));
        var snap = await session.AdvanceAsync(id);
        Assert.Equal(120, snap!.GameTime);
        Assert.Single(snap.Events);
        Assert.Equal(120, (await repo.LoadAsync(id))!.State.Time);
        Assert.Equal(2, snap.Game.Version);
    }

    [PostgresFact]
    public async Task Test_mode_runs_168_times_faster()
    {
        var (session, _, clock, _, id) = await SetupAsync("test");
        clock.Advance(TimeSpan.FromMinutes(30));
        Assert.Equal(302_400, (await session.AdvanceAsync(id))!.GameTime);
    }

    [PostgresFact]
    public async Task A_game_in_the_lobby_is_not_advanced()
    {
        var (session, _, clock, engine, id) = await SetupAsync("week", "lobby");
        clock.Advance(TimeSpan.FromHours(1));
        var snap = await session.AdvanceAsync(id);
        Assert.Equal(0, snap!.GameTime);
        Assert.Equal(0, engine.AdvanceCalls);
    }

    [PostgresFact]
    public async Task Unknown_game_gives_null()
    {
        var (session, _, _, _, _) = await SetupAsync("week");
        Assert.Null(await session.AdvanceAsync(Guid.NewGuid()));
    }

    [PostgresFact]
    public async Task Mutate_saves_the_changed_state()
    {
        var (session, repo, clock, _, id) = await SetupAsync("week");
        clock.Advance(TimeSpan.FromSeconds(10));
        await session.MutateAsync<int>(id, (s, _) => (s with { Config = s.Config with { ScoreTarget = 7 } }, 1));
        Assert.Equal(7, (await repo.LoadAsync(id))!.State.Config.ScoreTarget);
    }

    [PostgresFact]
    public async Task Parallel_requests_do_not_conflict()
    {
        var (session, _, clock, _, id) = await SetupAsync("week");
        clock.Advance(TimeSpan.FromSeconds(10));
        var tasks = Enumerable.Range(0, 8).Select(_ => session.AdvanceAsync(id)).ToArray();
        await Task.WhenAll(tasks);
        Assert.All(tasks, t => Assert.NotNull(t.Result));
    }

    [PostgresFact]
    public async Task Battle_events_are_stored_as_reports()
    {
        var (session, repo, clock, engine, id) = await SetupAsync("week");
        engine.EventKind = "BattleResolved";
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(id);
        var reports = await repo.ReportsAsync(id);
        Assert.Single(reports);
        Assert.Equal(30, reports[0].GameTime);
    }

    [PostgresFact]
    public async Task Other_events_store_no_report()
    {
        var (session, repo, clock, _, id) = await SetupAsync("week");
        clock.Advance(TimeSpan.FromSeconds(30));
        await session.AdvanceAsync(id);
        Assert.Empty(await repo.ReportsAsync(id));
    }
}
