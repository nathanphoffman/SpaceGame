using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameRepositoryTests
{
    private static readonly DateTimeOffset Now = StoredGame.StartTime;
    private static readonly GameState Start = StoredGame.EmptyState;

    [PostgresFact]
    public async Task State_round_trips_as_json()
    {
        var stored = await StoredGame.CreateAsync();
        var loaded = await stored.Repo.LoadAsync(stored.GameId);

        // Core state holds lists, so record equality is by reference: compare the JSON instead.
        Assert.Equal(JsonSerializer.Serialize(Start), JsonSerializer.Serialize(loaded!.State));
        Assert.Equal(0, loaded.Version);
    }

    [PostgresFact]
    public async Task Save_bumps_version_with_state_state()
    {
        var stored = await StoredGame.CreateAsync();
        var version = await stored.Writer.SaveAsync(stored.GameId, Start with { Time = 60 }, "running", 0, Now);
        var loaded = await stored.Repo.LoadAsync(stored.GameId);
        Assert.Equal(1, version);
        Assert.Equal(60, loaded!.State.Time);
        Assert.Equal("running", loaded.Status);
    }

    [PostgresFact]
    public async Task Stale_save_is_a_conflict()
    {
        var stored = await StoredGame.CreateAsync();
        await stored.Writer.SaveAsync(stored.GameId, Start with { Time = 60 }, "running", 0, Now);
        await Assert.ThrowsAsync<VersionConflictException>(
            () => stored.Writer.SaveAsync(stored.GameId, Start with { Time = 90 }, "running", 0, Now));
    }

    [PostgresFact]
    public async Task Concurrent_saves_let_only_one_win()
    {
        var stored = await StoredGame.CreateAsync();
        var other = new GameWriter(TestDatabase.NewContext(stored.Schema));
        var results = await Task.WhenAll(
            Try(() => stored.Writer.SaveAsync(stored.GameId, Start with { Time = 1 }, "running", 0, Now)),
            Try(() => other.SaveAsync(stored.GameId, Start with { Time = 2 }, "running", 0, Now)));
        Assert.Single(results, ok => ok);
    }

    [PostgresFact]
    public async Task Load_by_code_finds_the_game_but_unknown_code_is_null()
    {
        var stored = await StoredGame.CreateAsync("WXYZ");
        Assert.Equal(stored.GameId, (await stored.Repo.LoadByCodeAsync("WXYZ"))!.Id);
        Assert.Null(await stored.Repo.LoadByCodeAsync("NOPE"));
    }

    [PostgresFact]
    public async Task Duplicate_code_is_rejected()
    {
        var stored = await StoredGame.CreateAsync("DUPE");
        await Assert.ThrowsAnyAsync<Exception>(() => stored.Writer.CreateAsync("DUPE", "week", 1, Start, null, Now));
    }

    [PostgresFact]
    public async Task Players_with_reports_are_stored_per_game()
    {
        var stored = await StoredGame.CreateAsync();
        await stored.Writer.AddPlayerAsync(new PlayerRow { Id = Guid.NewGuid(), GameId = stored.GameId, Name = "Ann", TokenHash = "h1", IsHost = true });
        await stored.Writer.AddReportAsync(new ReportRow { Id = Guid.NewGuid(), GameId = stored.GameId, GameTime = 5, Kind = "BattleResolved", Payload = "{\"a\":1}" });
        Assert.Equal("Ann", Assert.Single(await stored.Repo.PlayersAsync(stored.GameId)).Name);
        Assert.Equal("BattleResolved", Assert.Single(await stored.Repo.ReportsAsync(stored.GameId)).Kind);
    }

    private static async Task<bool> Try(Func<Task<long>> save)
    {
        try { await save(); return true; }
        catch (VersionConflictException) { return false; }
    }
}
