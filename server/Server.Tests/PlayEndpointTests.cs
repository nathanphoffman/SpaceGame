using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Core;
using SpaceGame.Server.Api;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class PlayEndpointTests
{
    private static readonly SendFleetBody Order = new("a", new() { [ShipType.Scout] = 1 }, "b", null);

    private static async Task<(WebApplicationFactory<Program> Factory, HttpClient Client, CreateGameResponse Game)> StartedAsync()
    {
        var factory = (await LobbyApiFactory.CreateAsync()).WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IGameEngine>(new FakeEngine()))));
        var client = factory.CreateClient();
        var game = await LobbyApiFactory.CreateGameAsync(client);
        var start = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/start", game.PlayerToken));
        start.EnsureSuccessStatusCode();

        return (factory, client, game);
    }

    [PostgresFact]
    public async Task Map_is_public()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var map = await client.GetFromJsonAsync<GalaxyMap>($"/api/games/{game.GameId}/map");
        Assert.Single(map!.Systems);
    }

    [PostgresFact]
    public async Task Map_of_unknown_game_is_404()
    {
        var (factory, client, _) = await StartedAsync();
        await using var _f = factory;
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/games/{Guid.NewGuid()}/map")).StatusCode);
    }

    [PostgresFact]
    public async Task State_returns_the_view_with_the_saved_version()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var response = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/state", game.PlayerToken));
        var view = await response.Content.ReadFromJsonAsync<PlayerView>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(view!.Version > 0);
    }

    [PostgresFact]
    public async Task State_and_quote_need_a_token()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/games/{game.GameId}/state")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync($"/api/games/{game.GameId}/quote", Order)).StatusCode);
    }

    [PostgresFact]
    public async Task A_token_for_another_game_is_forbidden()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var other = await LobbyApiFactory.CreateGameAsync(client);
        var request = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/state", other.PlayerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    [PostgresFact]
    public async Task Quote_returns_the_trip_timer()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/quote", game.PlayerToken);
        request.Content = JsonContent.Create(Order);
        var quote = await (await client.SendAsync(request)).Content.ReadFromJsonAsync<FlightQuote>();
        Assert.True(quote!.Ok);
        Assert.True(quote.ArriveAt > quote.DepartAt);
    }

    [PostgresFact]
    public async Task Quote_rejects_a_body_without_ships()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/quote", game.PlayerToken);
        request.Content = JsonContent.Create(new SendFleetBody("a", null, "b", null));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(request)).StatusCode);
    }

    private static async Task<HttpResponseMessage> PostCommandAsync(HttpClient client, CreateGameResponse game, object body, bool withToken = true)
    {
        var request = withToken
            ? LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/commands", game.PlayerToken)
            : new HttpRequestMessage(HttpMethod.Post, $"/api/games/{game.GameId}/commands");
        request.Content = JsonContent.Create(body);

        return await client.SendAsync(request);
    }

    [PostgresFact]
    public async Task Command_is_applied_and_returns_the_result()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        var response = await PostCommandAsync(client, game, new { type = "colonize", planet = "p1" });
        var result = await response.Content.ReadFromJsonAsync<CommandResult>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(result!.Ok);
    }

    [PostgresFact]
    public async Task Unknown_command_type_is_400()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.BadRequest, (await PostCommandAsync(client, game, new { type = "selfDestruct" })).StatusCode);
    }

    [PostgresFact]
    public async Task Command_needs_a_token()
    {
        var (factory, client, game) = await StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.Unauthorized, (await PostCommandAsync(client, game, new { type = "colonize", planet = "p1" }, false)).StatusCode);
    }
}
