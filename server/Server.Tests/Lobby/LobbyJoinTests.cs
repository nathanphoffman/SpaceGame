using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class LobbyJoinTests
{
    private static async Task<HttpResponseMessage> JoinAsync(HttpClient c, string code, string name) =>
        await c.PostAsJsonAsync("/api/games/join", new JoinGameRequest(code, name));

    [PostgresFact]
    public async Task JoinIgnoresCodeCaseThenListsPlayerInLobby()
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

        await AssertProblemAsync(await JoinAsync(client, created.Code, "Extra"), HttpStatusCode.Conflict);
    }

    [PostgresFact]
    public async Task DuplicateNameIsRejectedIgnoringCase()
    {
        await using var factory = await LobbyApiFactory.CreateAsync();
        var client = factory.CreateClient();
        var created = await LobbyApiFactory.CreateGameAsync(client);
        await AssertProblemAsync(await JoinAsync(client, created.Code, "host"), HttpStatusCode.Conflict);
        Assert.Equal(HttpStatusCode.OK, (await JoinAsync(client, created.Code, "Bob")).StatusCode);
        await AssertProblemAsync(await JoinAsync(client, created.Code, "BOB"), HttpStatusCode.Conflict);
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal((int)status, problem!.Status);
        Assert.False(string.IsNullOrEmpty(problem.Detail));
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
        await AssertProblemAsync(byGuest, HttpStatusCode.Forbidden);
        var byHost = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, url, created.PlayerToken));
        Assert.Equal(HttpStatusCode.OK, byHost.StatusCode);

        await AssertProblemAsync(await JoinAsync(client, created.Code, "Late"), HttpStatusCode.Conflict);
        var again = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, url, created.PlayerToken));
        await AssertProblemAsync(again, HttpStatusCode.Conflict);
        var lobby = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{created.GameId}/lobby", created.PlayerToken));
        Assert.True((await lobby.Content.ReadFromJsonAsync<LobbyResponse>())!.Started);
    }
}
