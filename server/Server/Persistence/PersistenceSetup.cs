using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SpaceGame.Server.Persistence;

public static class PersistenceSetup
{
    public const string ConnectionName = "Postgres";

    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration config)
    {
        var connection = config.GetConnectionString(ConnectionName) ?? "Host=localhost;Database=spacegame;Username=postgres";
        services.AddDbContext<GameDbContext>(o => o.UseNpgsql(connection));
        services.AddScoped<GameRepository>();

        return services;
    }
}

/// <summary>Lets `dotnet ef migrations add` build the context without starting the app.</summary>
public sealed class GameDbContextFactory : IDesignTimeDbContextFactory<GameDbContext>
{
    public GameDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<GameDbContext>().UseNpgsql("Host=localhost;Database=design").Options);
}
