using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SpaceGame.Core;

namespace SpaceGame.Server.Persistence;

/// <summary>Writes games, players and reports. Reads live in <see cref="GameRepository"/>.</summary>
public sealed class GameWriter(GameDbContext dbContext)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<GameRow> CreateAsync(string code, string mode, int seed, GameState state, string? webhook, DateTimeOffset timestamp)
    {
        var gameRow = new GameRow
        {
            Id = Guid.NewGuid(),
            Code = code,
            Mode = mode,
            Seed = seed,
            Status = "lobby",
            Json = new GameJson { Config = JsonSerializer.Serialize(state.Config, Json), State = JsonSerializer.Serialize(state, Json) },
            DiscordWebhook = webhook,
            Times = new GameTimes { CreatedAt = timestamp, UpdatedAt = timestamp },
        };

        dbContext.Games.Add(gameRow);
        await dbContext.SaveChangesAsync();

        return gameRow;
    }

    /// <summary>Saves the state if the stored version still equals expectedVersion; returns the new version.</summary>
    public async Task<long> SaveAsync(Guid gameId, GameState state, string status, long expectedVersion, DateTimeOffset timestamp, DateTimeOffset? startedAt = null)
    {
        // One UPDATE guarded by the version: if another request saved first, zero rows match and we report a conflict.
        // startedAt stays as stored when null, so only the lobby start changes it.
        var updatedRows = await dbContext.Games.Where(game => game.Id == gameId && game.Version == expectedVersion)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(game => game.Times.StartedAt, game => startedAt ?? game.Times.StartedAt)
                .SetProperty(game => game.Json.State, JsonSerializer.Serialize(state, Json))
                .SetProperty(game => game.Status, status)
                .SetProperty(game => game.Version, expectedVersion + 1)
                .SetProperty(game => game.Times.UpdatedAt, timestamp));

        return updatedRows == 1 ? expectedVersion + 1 : throw new VersionConflictException(gameId);
    }

    public async Task AddPlayerAsync(PlayerRow player)
    {
        dbContext.Players.Add(player);
        await dbContext.SaveChangesAsync();
    }

    public async Task AddReportAsync(ReportRow report)
    {
        dbContext.Reports.Add(report);
        await dbContext.SaveChangesAsync();
    }

    public async Task AddReportsAsync(IReadOnlyList<ReportRow> reports)
    {
        dbContext.Reports.AddRange(reports);
        await dbContext.SaveChangesAsync();
    }
}
