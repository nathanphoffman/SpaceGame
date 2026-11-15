using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

/// <summary>One game row in its own migrated schema, with the reader and writer that point at it.</summary>
public sealed class StoredGame
{
    public static readonly DateTimeOffset StartTime = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    public static readonly GameState EmptyState = new(new GameConfig(), 0);

    public required GameDbContext Db { get; init; }
    public required string Schema { get; init; }
    public required GameRepository Repo { get; init; }
    public required GameWriter Writer { get; init; }
    public required Guid GameId { get; init; }

    public static async Task<StoredGame> CreateAsync(string code = "ABCD", string mode = "week", string status = "lobby", string? webhook = null)
    {
        var schema = await TestDatabase.MigratedSchemaAsync();
        var db = TestDatabase.NewContext(schema);
        var writer = new GameWriter(db);
        var gameRow = await writer.CreateAsync(code, mode, 1, EmptyState, webhook, StartTime);

        if (status != "lobby")
        {
            await writer.SaveAsync(gameRow.Id, EmptyState, status, 0, StartTime, StartTime);
        }

        return new StoredGame { Db = db, Schema = schema, Repo = new GameRepository(db), Writer = writer, GameId = gameRow.Id };
    }
}
