using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SpaceGame.Core;

namespace SpaceGame.Server.Persistence;

/// <summary>Thrown when a save lost a race: someone else saved a newer version first.</summary>
public sealed class VersionConflictException(Guid gameId) : Exception($"Game {gameId} was changed by someone else.");

/// <summary>A game's state with the version it was loaded at.</summary>
public sealed record LoadedGame(Guid Id, string Code, string Mode, int Seed, string Status, GameState State, long Version, DateTimeOffset? StartedAt);

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
            Config = JsonSerializer.Serialize(state.Config, Json),
            State = JsonSerializer.Serialize(state, Json),
            DiscordWebhook = webhook,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Games.Add(row);
        await db.SaveChangesAsync();

        return row;
    }

    public async Task<LoadedGame?> LoadAsync(Guid id)
    {
        var row = await db.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id);

        return row is null ? null : ToLoaded(row);
    }

    public async Task<LoadedGame?> LoadByCodeAsync(string code)
    {
        var row = await db.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Code == code);

        return row is null ? null : ToLoaded(row);
    }

    /// <summary>Saves the state if the stored version still equals expectedVersion; returns the new version.</summary>
    public async Task<long> SaveAsync(Guid id, GameState state, string status, long expectedVersion, DateTimeOffset now, DateTimeOffset? startedAt = null)
    {
        var rows = await db.Games.Where(g => g.Id == id && g.Version == expectedVersion)
            .ExecuteUpdateAsync(s => s
                .SetProperty(g => g.StartedAt, g => startedAt ?? g.StartedAt)
                .SetProperty(g => g.State, JsonSerializer.Serialize(state, Json))
                .SetProperty(g => g.Status, status)
                .SetProperty(g => g.Version, expectedVersion + 1)
                .SetProperty(g => g.UpdatedAt, now));

        return rows == 1 ? expectedVersion + 1 : throw new VersionConflictException(id);
    }

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

    public Task<List<ReportRow>> ReportsAsync(Guid gameId) =>
        db.Reports.AsNoTracking().Where(r => r.GameId == gameId).OrderBy(r => r.GameTime).ToListAsync();

    private static LoadedGame ToLoaded(GameRow row) =>
        new(row.Id, row.Code, row.Mode, row.Seed, row.Status,
            JsonSerializer.Deserialize<GameState>(row.State, Json)!, row.Version, row.StartedAt);
}
