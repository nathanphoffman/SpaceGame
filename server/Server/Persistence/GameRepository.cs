using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SpaceGame.Core;

namespace SpaceGame.Server.Persistence;

/// <summary>Thrown when a save lost a race: someone else saved a newer version first.</summary>
public sealed class VersionConflictException(Guid gameId) : Exception($"Game {gameId} was changed by someone else.");

/// <summary>A game's state with the version it was loaded at.</summary>
public sealed record LoadedGame(Guid Id, string Code, string Mode, int Seed, string Status, GameState State, long Version, DateTimeOffset? StartedAt, string? DiscordWebhook = null);

/// <summary>Reads games, players and reports. Writes live in <see cref="GameWriter"/>.</summary>
public sealed class GameRepository(GameDbContext db)
{
    private const string BattleKind = "BattleResolved";
    private const string OutcomeKind = "GameEnded";

    private const string RunningStatus = "running";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // The lambdas below only say which column to match; LoadWhereAsync does the actual query.
    public Task<LoadedGame?> LoadAsync(Guid id) => LoadWhereAsync(g => g.Id == id);

    public Task<LoadedGame?> LoadByCodeAsync(string code) => LoadWhereAsync(g => g.Code == code);

    public Task<List<Guid>> RunningGameIdsAsync() =>
        db.Games.AsNoTracking().Where(g => g.Status == RunningStatus).Select(g => g.Id).ToListAsync();

    public Task<PlayerRow?> PlayerByTokenHashAsync(string hash) =>
        db.Players.AsNoTracking().FirstOrDefaultAsync(p => p.TokenHash == hash);

    public Task<List<PlayerRow>> PlayersAsync(Guid gameId) =>
        db.Players.AsNoTracking().Where(p => p.GameId == gameId).ToListAsync();

    public Task<ReportRow?> ReportAsync(Guid gameId, Guid reportId) =>
        db.Reports.AsNoTracking().FirstOrDefaultAsync(r => r.GameId == gameId && r.Id == reportId && r.Kind == BattleKind);

    public Task<List<ReportRow>> ReportsAsync(Guid gameId) =>
        db.Reports.AsNoTracking().Where(r => r.GameId == gameId && r.Kind == BattleKind).OrderBy(r => r.GameTime).ToListAsync();

    public Task<ReportRow?> OutcomeAsync(Guid gameId) =>
        db.Reports.AsNoTracking().FirstOrDefaultAsync(r => r.GameId == gameId && r.Kind == OutcomeKind);

    private async Task<LoadedGame?> LoadWhereAsync(Expression<Func<GameRow, bool>> match)
    {
        var row = await db.Games.AsNoTracking().FirstOrDefaultAsync(match);

        return row is null ? null : ToLoaded(row);
    }

    private static LoadedGame ToLoaded(GameRow row) =>
        new(row.Id, row.Code, row.Mode, row.Seed, row.Status,
            JsonSerializer.Deserialize<GameState>(row.Json.State, Json)!, row.Version, row.Times.StartedAt, row.DiscordWebhook);
}
