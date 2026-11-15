using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly GameState Start = new(new GameConfig(), 0);

    private static async Task<(GameRepository Repo, Guid Id, string Schema)> NewGameAsync(string code = "ABCD")
    {
        var schema = await TestDatabase.MigratedSchemaAsync();
        var repo = new GameRepository(TestDatabase.NewContext(schema));
        var row = await repo.CreateAsync(code, "week", 1, Start, null, Now);

        return (repo, row.Id, schema);
    }

    [PostgresFact]
    public async Task State_round_trips_as_json()
    {
        var (repo, id, _) = await NewGameAsync();
        var loaded = await repo.LoadAsync(id);

        // Core state holds lists, so record equality is by reference: compare the JSON instead.
        Assert.Equal(JsonSerializer.Serialize(Start), JsonSerializer.Serialize(loaded!.State));
        Assert.Equal(0, loaded.Version);
    }

    [PostgresFact]
    public async Task Save_bumps_version_and_stores_state()
    {
        var (repo, id, _) = await NewGameAsync();
        var version = await repo.SaveAsync(id, Start with { Time = 60 }, "running", 0, Now);
        var loaded = await repo.LoadAsync(id);
        Assert.Equal(1, version);
        Assert.Equal(60, loaded!.State.Time);
        Assert.Equal("running", loaded.Status);
    }

    [PostgresFact]
    public async Task Stale_save_is_a_conflict()
    {
        var (repo, id, _) = await NewGameAsync();
        await repo.SaveAsync(id, Start with { Time = 60 }, "running", 0, Now);
        await Assert.ThrowsAsync<VersionConflictException>(
            () => repo.SaveAsync(id, Start with { Time = 90 }, "running", 0, Now));
    }

    [PostgresFact]
    public async Task Concurrent_saves_let_only_one_win()
    {
        var (repo, id, schema) = await NewGameAsync();
        var other = new GameRepository(TestDatabase.NewContext(schema));
        var results = await Task.WhenAll(
            Try(() => repo.SaveAsync(id, Start with { Time = 1 }, "running", 0, Now)),
            Try(() => other.SaveAsync(id, Start with { Time = 2 }, "running", 0, Now)));
        Assert.Single(results, ok => ok);
    }

    [PostgresFact]
    public async Task Load_by_code_finds_the_game_and_unknown_code_is_null()
    {
        var (repo, id, _) = await NewGameAsync("WXYZ");
        Assert.Equal(id, (await repo.LoadByCodeAsync("WXYZ"))!.Id);
        Assert.Null(await repo.LoadByCodeAsync("NOPE"));
    }

    [PostgresFact]
    public async Task Duplicate_code_is_rejected()
    {
        var (repo, _, _) = await NewGameAsync("DUPE");
        await Assert.ThrowsAnyAsync<Exception>(() => repo.CreateAsync("DUPE", "week", 1, Start, null, Now));
    }

    [PostgresFact]
    public async Task Players_and_reports_are_stored_per_game()
    {
        var (repo, id, _) = await NewGameAsync();
        await repo.AddPlayerAsync(new PlayerRow { Id = Guid.NewGuid(), GameId = id, Name = "Ann", TokenHash = "h1", IsHost = true });
        await repo.AddReportAsync(new ReportRow { Id = Guid.NewGuid(), GameId = id, GameTime = 5, Kind = "battle", Payload = "{\"a\":1}" });
        Assert.Equal("Ann", Assert.Single(await repo.PlayersAsync(id)).Name);
        Assert.Equal("battle", Assert.Single(await repo.ReportsAsync(id)).Kind);
    }

    private static async Task<bool> Try(Func<Task<long>> save)
    {
        try { await save(); return true; }
        catch (VersionConflictException) { return false; }
    }
}
