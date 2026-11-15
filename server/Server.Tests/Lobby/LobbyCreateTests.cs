using System.Net;
using System.Net.Http.Json;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class LobbyCreateTests
{
    [PostgresFact]
    public async Task CreateReturnsHostPlayerWithCode()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var created = await LobbyApiFactory.CreateGameAsync(factory.CreateClient());
        Assert.Equal(JoinCodes.Length, created.Code.Length);
        Assert.False(string.IsNullOrEmpty(created.PlayerToken));
    }

    [PostgresFact]
    public async Task CreateRejectsBadInput()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();

        foreach (var bad in new[]
        {
            new CreateGameRequest("", "week", null, null),
            new CreateGameRequest("Ann", "forever", null, null),
            new CreateGameRequest("Ann", "week", null, "http://insecure.example/hook"),
            new CreateGameRequest(new string('x', 31), "week", null, null),
        })
        {
            var response = await client.PostAsJsonAsync("/api/games", bad);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        }
    }

    [PostgresFact]
    public async Task TokenIsStoredHashed()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var created = await LobbyApiFactory.CreateGameAsync(factory.CreateClient());

        using var scope = factory.Services.CreateScope();
        var players = await scope.ServiceProvider.GetRequiredService<GameRepository>().PlayersAsync(created.GameId);
        Assert.Equal(PlayerTokens.Hash(created.PlayerToken), Assert.Single(players).TokenHash);
    }
}
