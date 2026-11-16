using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace SpaceGame.Server.Tests;

public class HostTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly string[] ContractRoutes =
    [
        "post /api/games/",
        "post /api/games/join",
        "get /api/games/{gameId}/lobby",
        "post /api/games/{gameId}/start",
        "get /api/games/{gameId}/map",
        "get /api/games/{gameId}/state",
        "post /api/games/{gameId}/commands",
        "post /api/games/{gameId}/quote",
        "get /api/games/{gameId}/reports",
        "get /api/games/{gameId}/reports/{id}",
        "get /health",
    ];

    private readonly WebApplicationFactory<Program> _factory;

    // These tests have no database, so the app must not try to migrate at start.
    public HostTests(WebApplicationFactory<Program> factory) =>
        _factory = factory.WithWebHostBuilder(b => b.UseSetting("Database:MigrateOnStart", "false"));

    [Fact]
    public async Task HealthReturnsOk()
    {
        var response = await _factory.CreateClient().GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"status\":\"ok\"", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public void DefaultConnectionMatchesComposeDatabase()
    {
        var compose = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "../../../../../docker-compose.yml"));
        Assert.Contains("\"5440:5432\"", compose);
        Assert.Contains("Port=5440", SpaceGame.Server.Persistence.PersistenceSetup.DefaultConnection);
    }

    [Fact]
    public async Task OpenApiDocumentListsEveryContractEndpoint()
    {
        var json = await _factory.CreateClient().GetStringAsync("/openapi.json");

        using var doc = JsonDocument.Parse(json);
        var listed = doc.RootElement.GetProperty("paths").EnumerateObject()
            .SelectMany(p => p.Value.EnumerateObject().Select(m => $"{m.Name} {p.Name}"))
            .ToHashSet();

        foreach (var route in ContractRoutes)
        {
            Assert.Contains(route.TrimEnd('/'), listed.Select(l => l.TrimEnd('/')));
        }
    }

    [Fact]
    public async Task ErrorsComeBackAsProblemDetails()
    {
        var response = await _factory.CreateClient().GetAsync("/api/games/x/map");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task UnknownRouteIsProblemDetails()
    {
        var response = await _factory.CreateClient().GetAsync("/nope");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public void ClockCanBeReplacedWithAFakeOne()
    {
        var start = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var fake = new FakeClock(start);

        using var factory = _factory.WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IClock>(fake))));
        fake.MoveForward(TimeSpan.FromMinutes(5));
        Assert.Equal(start.AddMinutes(5), factory.Services.GetRequiredService<IClock>().UtcNow);
    }
}
