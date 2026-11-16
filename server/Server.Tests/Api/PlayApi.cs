using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Core;
using SpaceGame.Server.Api;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

public static class PlayApi
{
    public static readonly SendFleetBody Order = new("a", new() { [ShipType.Scout] = 1 }, "b", null);

    public static async Task<(WebApplicationFactory<Program> Factory, HttpClient Client, CreateGameResponse Game)> StartedAsync()
    {
        var factory = (await LobbyApiFactory.CreateAsync()).WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IGameEngine>(new FakeEngine()))));
        var client = factory.CreateClient();
        var game = await LobbyApiFactory.CreateGameAsync(client);
        var start = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/start", game.PlayerToken));
        start.EnsureSuccessStatusCode();

        return (factory, client, game);
    }

    public static async Task<HttpResponseMessage> PostCommandAsync(HttpClient client, CreateGameResponse game, object body)
    {
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/commands", game.PlayerToken);
        request.Content = JsonContent.Create(body);

        return await client.SendAsync(request);
    }

    public static Task<HttpResponseMessage> PostCommandWithoutTokenAsync(HttpClient client, CreateGameResponse game, object body) =>
        client.PostAsJsonAsync($"/api/games/{game.GameId}/commands", body);

    /// <summary>Marks the game finished directly in the database, as the clock does when the engine reports GameEnded.</summary>
    public static async Task FinishAsync(WebApplicationFactory<Program> factory, CreateGameResponse game)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var stored = await scope.ServiceProvider.GetRequiredService<SpaceGame.Server.Persistence.GameRepository>().LoadAsync(game.GameId);
        await scope.ServiceProvider.GetRequiredService<SpaceGame.Server.Persistence.GameWriter>()
            .SaveAsync(game.GameId, stored!.State, LobbyService.FinishedStatus, stored.Version, DateTimeOffset.UtcNow);
    }
}
