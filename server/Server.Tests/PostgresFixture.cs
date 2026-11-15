using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

/// <summary>Marks a test that needs Postgres; it skips itself when SPACEGAME_TEST_PG is not set.</summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        Skip = TestDatabase.ConnectionString is null ? "SPACEGAME_TEST_PG is not set" : null;
    }
}

/// <summary>Gives each test its own schema so tests can run in parallel.</summary>
public static class TestDatabase
{
    public static string? ConnectionString => Environment.GetEnvironmentVariable("SPACEGAME_TEST_PG");

    public static async Task<string> CreateSchemaAsync()
    {
        var schema = "t_" + Guid.NewGuid().ToString("N");
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", conn);
        await cmd.ExecuteNonQueryAsync();

        return schema;
    }

    public static GameDbContext NewContext(string schema)
    {
        var connection = $"{ConnectionString};Search Path={schema}";

        return new GameDbContext(new DbContextOptionsBuilder<GameDbContext>().UseNpgsql(connection).Options);
    }

    public static async Task<string> MigratedSchemaAsync()
    {
        var schema = await CreateSchemaAsync();
        await using var db = NewContext(schema);
        await db.Database.MigrateAsync();

        return schema;
    }
}
