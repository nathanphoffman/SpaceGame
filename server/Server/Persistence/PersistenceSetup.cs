using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceGame.Server.Persistence;

public static class PersistenceSetup
{
    public const string ConnectionName = "Postgres";

    /// <summary>Matches docker-compose.yml, so `docker compose up -d db` + `dotnet run` works with no settings.</summary>
    public const string DefaultConnection = "Host=localhost;Port=5440;Database=spacegame;Username=space;Password=space";
    public const string MigrateOnStartSetting = "Database:MigrateOnStart";

    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration config)
    {
        var connection = config.GetConnectionString(ConnectionName) ?? DefaultConnection;
        services.AddDbContext<GameDbContext>(o => o.UseNpgsql(connection));
        services.AddScoped<GameRepository>();
        services.AddScoped<GameWriter>();

        return services;
    }

    // The build starts the app only to write openapi.json; there is no database then.
    private static bool IsGeneratingOpenApi() =>
        System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";

    /// <summary>Applies pending EF migrations so a fresh database works without manual steps. Turn off with Database:MigrateOnStart=false.</summary>
    public static void MigrateDatabaseOnStart(this WebApplication app)
    {
        if (!app.Configuration.GetValue(MigrateOnStartSetting, true) || IsGeneratingOpenApi())
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<GameDbContext>().Database.Migrate();
    }
}

/// <summary>Lets `dotnet ef migrations add` build the context without starting the app.</summary>
public sealed class GameDbContextFactory : IDesignTimeDbContextFactory<GameDbContext>
{
    public GameDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<GameDbContext>().UseNpgsql("Host=localhost;Database=design").Options);
}
