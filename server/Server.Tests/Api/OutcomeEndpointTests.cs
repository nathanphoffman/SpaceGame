using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class OutcomeEndpointTests
{
    private static string OutcomeUrl(CreateGameResponse game) => $"/api/games/{game.GameId}/outcome";

    private static string StateUrl(CreateGameResponse game) => $"/api/games/{game.GameId}/state";

    [PostgresFact]
    public async Task Outcome_is_404_while_the_game_runs()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, OutcomeUrl(game), game.PlayerToken));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [PostgresFact]
    public async Task Outcome_needs_a_token()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(OutcomeUrl(game))).StatusCode);
    }

    [PostgresFact]
    public async Task Outcome_after_the_game_ends_has_winner_scores_and_contributions()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        using var endingFactory = factory.WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IGameEngine>(new FakeEngine { EventKind = EventNotifications.GameEndedKind }))));
        var ending = endingFactory.CreateClient();
        (await ending.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, StateUrl(game), game.PlayerToken))).EnsureSuccessStatusCode();

        var outcome = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, OutcomeUrl(game), game.PlayerToken));
        var body = await outcome.Content.ReadFromJsonAsync<GameOutcome>();
        Assert.Equal(HttpStatusCode.OK, outcome.StatusCode);
        Assert.Equal(("team", "score", 12, 4), (body!.Winner, body.Reason, body.TeamScore, body.EnemyScore));
        Assert.Equal(["Ann", "Bo"], body.Contributions.Select(c => c.Player));
    }

    [PostgresFact]
    public async Task The_outcome_is_not_listed_as_a_battle_report()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        using var endingFactory = factory.WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IGameEngine>(new FakeEngine { EventKind = EventNotifications.GameEndedKind }))));
        var ending = endingFactory.CreateClient();
        (await ending.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, StateUrl(game), game.PlayerToken))).EnsureSuccessStatusCode();

        var reports = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/reports", game.PlayerToken));
        Assert.Empty((await reports.Content.ReadFromJsonAsync<List<BattleReport>>())!);
    }
}
