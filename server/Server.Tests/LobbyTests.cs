using System.Net;
using System.Net.Http.Json;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class LobbyTests
{
    private static async Task<HttpResponseMessage> JoinAsync(HttpClient c, string code, string name) =>
        await c.PostAsJsonAsync("/api/games/join", new JoinGameRequest(code, name));

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

    [PostgresFact]
    public async Task JoinIgnoresCodeCaseAndListsPlayerInLobby()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();
        var created = await LobbyApiFactory.CreateGameAsync(client);
        var joined = await JoinAsync(client, created.Code.ToLowerInvariant(), "Bob");
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        var request = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{created.GameId}/lobby", created.PlayerToken);
        var lobby = await (await client.SendAsync(request)).Content.ReadFromJsonAsync<LobbyResponse>();
        Assert.Equal(["Host", "Bob"], lobby!.Players.Select(p => p.Name).Order().Reverse());
        Assert.False(lobby.Started);
        Assert.True(lobby.Players.Single(p => p.Name == "Host").IsHost);
    }

    [PostgresFact]
    public async Task JoinUnknownCodeIsNotFound()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var response = await JoinAsync(factory.CreateClient(), "ZZZZZ", "Bob");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [PostgresFact]
    public async Task NinthPlayerIsRejected()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();
        var created = await LobbyApiFactory.CreateGameAsync(client);

        for (var i = 1; i < LobbyService.MaxPlayers; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await JoinAsync(client, created.Code, $"P{i}")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Conflict, (await JoinAsync(client, created.Code, "Extra")).StatusCode);
    }

    [PostgresFact]
    public async Task LobbyNeedsAValidTokenForThatGame()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();
        var one = await LobbyApiFactory.CreateGameAsync(client);
        var two = await LobbyApiFactory.CreateGameAsync(client);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/games/{one.GameId}/lobby")).StatusCode);
        var bad = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{one.GameId}/lobby", "nope");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(bad)).StatusCode);
        var other = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{one.GameId}/lobby", two.PlayerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(other)).StatusCode);
    }

    [PostgresFact]
    public async Task StartIsHostOnlyWithJoinsClosedAfterwards()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();
        var created = await LobbyApiFactory.CreateGameAsync(client);
        var guest = await (await JoinAsync(client, created.Code, "Bob")).Content.ReadFromJsonAsync<JoinGameResponse>();
        var url = $"/api/games/{created.GameId}/start";

        var byGuest = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, url, guest!.PlayerToken));
        Assert.Equal(HttpStatusCode.Forbidden, byGuest.StatusCode);
        var byHost = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, url, created.PlayerToken));
        Assert.Equal(HttpStatusCode.OK, byHost.StatusCode);

        Assert.Equal(HttpStatusCode.Conflict, (await JoinAsync(client, created.Code, "Late")).StatusCode);
        var again = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, url, created.PlayerToken));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        var lobby = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{created.GameId}/lobby", created.PlayerToken));
        Assert.True((await lobby.Content.ReadFromJsonAsync<LobbyResponse>())!.Started);
    }
}
