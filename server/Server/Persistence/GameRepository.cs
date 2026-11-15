using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SpaceGame.Core;

namespace SpaceGame.Server.Persistence;

/// <summary>Thrown when a save lost a race: someone else saved a newer version first.</summary>
public sealed class VersionConflictException(Guid gameId) : Exception($"Game {gameId} was changed by someone else.");

/// <summary>A game's state with the version it was loaded at.</summary>
public sealed record LoadedGame(Guid Id, string Code, string Mode, int Seed, string Status, GameState State, long Version, DateTimeOffset? StartedAt, string? DiscordWebhook = null);

public sealed class GameRepository(GameDbContext db)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<GameRow> CreateAsync(string code, string mode, int seed, GameState state, string? webhook, DateTimeOffset now)
    {
        var row = new GameRow
        {
            Id = Guid.NewGuid(),
            Code = code,
            Mode = mode,
            Seed = seed,
            Status = "lobby",
            Json = new GameJson { Config = JsonSerializer.Serialize(state.Config, Json), State = JsonSerializer.Serialize(state, Json) },
            DiscordWebhook = webhook,
            Times = new GameTimes { CreatedAt = now, UpdatedAt = now },
        };

        db.Games.Add(row);
        await db.SaveChangesAsync();

        return row;
    }

    public Task<LoadedGame?> LoadAsync(Guid id) => LoadWhereAsync(g => g.Id == id);

    public Task<LoadedGame?> LoadByCodeAsync(string code) => LoadWhereAsync(g => g.Code == code);

    /// <summary>Saves the state if the stored version still equals expectedVersion; returns the new version.</summary>
    public async Task<long> SaveAsync(Guid id, GameState state, string status, long expectedVersion, DateTimeOffset now, DateTimeOffset? startedAt = null)
    {
        var rows = await db.Games.Where(g => g.Id == id && g.Version == expectedVersion)
            .ExecuteUpdateAsync(s => s
                .SetProperty(g => g.Times.StartedAt, g => startedAt ?? g.Times.StartedAt)
                .SetProperty(g => g.Json.State, JsonSerializer.Serialize(state, Json))
                .SetProperty(g => g.Status, status)
                .SetProperty(g => g.Version, expectedVersion + 1)
                .SetProperty(g => g.Times.UpdatedAt, now));

        return rows == 1 ? expectedVersion + 1 : throw new VersionConflictException(id);
    }

    public Task<List<Guid>> RunningGameIdsAsync() =>
        db.Games.AsNoTracking().Where(g => g.Status == "running").Select(g => g.Id).ToListAsync();

    public Task<PlayerRow?> PlayerByTokenHashAsync(string hash) =>
        db.Players.AsNoTracking().FirstOrDefaultAsync(p => p.TokenHash == hash);

    public async Task AddPlayerAsync(PlayerRow player)
    {
        db.Players.Add(player);
        await db.SaveChangesAsync();
    }

    public Task<List<PlayerRow>> PlayersAsync(Guid gameId) =>
        db.Players.AsNoTracking().Where(p => p.GameId == gameId).ToListAsync();

    public async Task AddReportAsync(ReportRow report)
    {
        db.Reports.Add(report);
        await db.SaveChangesAsync();
    }

    public async Task AddReportsAsync(IReadOnlyList<ReportRow> reports)
    {
        db.Reports.AddRange(reports);
        await db.SaveChangesAsync();
    }

    public Task<ReportRow?> ReportAsync(Guid gameId, Guid reportId) =>
        db.Reports.AsNoTracking().FirstOrDefaultAsync(r => r.GameId == gameId && r.Id == reportId);

    public Task<List<ReportRow>> ReportsAsync(Guid gameId) =>
        db.Reports.AsNoTracking().Where(r => r.GameId == gameId).OrderBy(r => r.GameTime).ToListAsync();

    private async Task<LoadedGame?> LoadWhereAsync(Expression<Func<GameRow, bool>> match)
    {
        var row = await db.Games.AsNoTracking().FirstOrDefaultAsync(match);

        return row is null ? null : ToLoaded(row);
    }

    private static LoadedGame ToLoaded(GameRow row) =>
        new(row.Id, row.Code, row.Mode, row.Seed, row.Status,
            JsonSerializer.Deserialize<GameState>(row.Json.State, Json)!, row.Version, row.Times.StartedAt, row.DiscordWebhook);
}
