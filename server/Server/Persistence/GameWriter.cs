using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SpaceGame.Core;

namespace SpaceGame.Server.Persistence;

/// <summary>Writes games, players and reports. Reads live in <see cref="GameRepository"/>.</summary>
public sealed class GameWriter(GameDbContext db)
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

    /// <summary>Saves the state if the stored version still equals expectedVersion; returns the new version.</summary>
    public async Task<long> SaveAsync(Guid id, GameState state, string status, long expectedVersion, DateTimeOffset now, DateTimeOffset? startedAt = null)
    {
        // One UPDATE guarded by the version: if another request saved first, zero rows match and we report a conflict.
        // startedAt stays as stored when null, so only the lobby start changes it.
        var rows = await db.Games.Where(g => g.Id == id && g.Version == expectedVersion)
            .ExecuteUpdateAsync(s => s
                .SetProperty(g => g.Times.StartedAt, g => startedAt ?? g.Times.StartedAt)
                .SetProperty(g => g.Json.State, JsonSerializer.Serialize(state, Json))
                .SetProperty(g => g.Status, status)
                .SetProperty(g => g.Version, expectedVersion + 1)
                .SetProperty(g => g.Times.UpdatedAt, now));

        return rows == 1 ? expectedVersion + 1 : throw new VersionConflictException(id);
    }

    public async Task AddPlayerAsync(PlayerRow player)
    {
        db.Players.Add(player);
        await db.SaveChangesAsync();
    }

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
}
