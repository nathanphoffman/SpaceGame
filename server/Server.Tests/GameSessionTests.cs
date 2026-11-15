using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class TimeScaleTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Week_mode_is_real_time() =>
        Assert.Equal(90, TimeScale.GameTime(Start, Start.AddSeconds(90), "week", 604_800));

    [Fact]
    public void Test_mode_runs_a_week_in_one_hour() =>
        Assert.Equal(604_800, TimeScale.GameTime(Start, Start.AddHours(1), "test", 604_800));

    [Fact]
    public void Game_time_stops_at_the_end_of_the_game() =>
        Assert.Equal(604_800, TimeScale.GameTime(Start, Start.AddDays(9), "week", 604_800));

    [Fact]
    public void Game_time_is_never_negative() =>
        Assert.Equal(0, TimeScale.GameTime(Start, Start.AddSeconds(-5), "week", 604_800));

    [Fact]
    public void Same_seed_and_time_give_the_same_dice()
    {
        var a = new SeededDice(5, 100);
        var b = new SeededDice(5, 100);
        Assert.Equal(Enumerable.Range(0, 20).Select(_ => a.Roll()), Enumerable.Range(0, 20).Select(_ => b.Roll()));
    }
}

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

        return (new GameSession(repo, engine, clock, new GameLocks()), repo, clock, engine, row.Id);
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
}
