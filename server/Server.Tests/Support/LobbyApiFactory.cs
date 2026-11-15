using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

/// <summary>Starts the app against its own migrated Postgres schema.</summary>
public static class LobbyApiFactory
{
    public static async Task<WebApplicationFactory<Program>> CreateAsync()
    {
        var schema = await TestDatabase.MigratedSchemaAsync();
        var connection = $"{TestDatabase.ConnectionString};Search Path={schema}";

        // Swap the app's database for this test's own schema so tests can run in parallel.
        return new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.RemoveAll<DbContextOptions<GameDbContext>>();
            s.AddDbContext<GameDbContext>(o => o.UseNpgsql(connection));
        }));
    }

    private const int FixedSeed = 7;

    public static async Task<CreateGameResponse> CreateGameAsync(HttpClient client, string mode = "week")
    {
        var response = await client.PostAsJsonAsync("/api/games", new CreateGameRequest("Host", mode, FixedSeed, null));
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<CreateGameResponse>())!;
    }

    public static HttpRequestMessage WithToken(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return request;
    }
}
