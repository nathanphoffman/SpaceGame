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
public class PlayCommandEndpointTests
{
    [PostgresFact]
    public async Task Command_is_applied_and_returns_the_result()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await PlayApi.PostCommandAsync(client, game, new { type = "colonize", planet = "p1" });
        var result = await response.Content.ReadFromJsonAsync<CommandResult>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(result!.Ok);
    }

    [PostgresFact]
    public async Task Unknown_command_type_is_400()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.BadRequest, (await PlayApi.PostCommandAsync(client, game, new { type = "selfDestruct" })).StatusCode);
    }

    [PostgresFact]
    public async Task Command_needs_a_token()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.Unauthorized, (await PlayApi.PostCommandWithoutTokenAsync(client, game, new { type = "colonize", planet = "p1" })).StatusCode);
    }

    [PostgresFact]
    public async Task Command_on_a_finished_game_is_409()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        await PlayApi.FinishAsync(factory, game);
        var response = await PlayApi.PostCommandAsync(client, game, new { type = "colonize", planet = "p1" });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains(PlayEndpoints.GameOverMessage, await response.Content.ReadAsStringAsync());
    }

    [PostgresFact]
    public async Task State_and_map_still_work_on_a_finished_game()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        await PlayApi.FinishAsync(factory, game);
        var state = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/state", game.PlayerToken));
        var map = await client.GetAsync($"/api/games/{game.GameId}/map");
        Assert.Equal(HttpStatusCode.OK, state.StatusCode);
        Assert.Equal(HttpStatusCode.OK, map.StatusCode);
    }
}
