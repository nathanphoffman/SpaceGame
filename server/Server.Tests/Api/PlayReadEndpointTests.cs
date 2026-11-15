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
public class PlayReadEndpointTests
{
    [PostgresFact]
    public async Task Map_is_public()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var map = await client.GetFromJsonAsync<GalaxyMap>($"/api/games/{game.GameId}/map");
        Assert.Single(map!.Systems);
    }

    [PostgresFact]
    public async Task Map_of_unknown_game_is_404()
    {
        var (factory, client, _) = await PlayApi.StartedAsync();
        await using var _f = factory;
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/games/{Guid.NewGuid()}/map")).StatusCode);
    }

    [PostgresFact]
    public async Task State_returns_the_view_with_the_saved_version()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/state", game.PlayerToken));
        var view = await response.Content.ReadFromJsonAsync<PlayerView>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(view!.Version > 0);
    }

    [PostgresFact]
    public async Task State_and_quote_need_a_token()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/games/{game.GameId}/state")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync($"/api/games/{game.GameId}/quote", PlayApi.Order)).StatusCode);
    }

    [PostgresFact]
    public async Task A_token_for_another_game_is_forbidden()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var other = await LobbyApiFactory.CreateGameAsync(client);
        var request = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/state", other.PlayerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    [PostgresFact]
    public async Task Quote_returns_the_trip_timer()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/quote", game.PlayerToken);
        request.Content = JsonContent.Create(PlayApi.Order);
        var quote = await (await client.SendAsync(request)).Content.ReadFromJsonAsync<FlightQuote>();
        Assert.True(quote!.Ok);
        Assert.True(quote.ArriveAt > quote.DepartAt);
    }

    [PostgresFact]
    public async Task Quote_rejects_a_body_without_ships()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/quote", game.PlayerToken);
        request.Content = JsonContent.Create(new SendFleetBody("a", null, "b", null));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(request)).StatusCode);
    }
}
