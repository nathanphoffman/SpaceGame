using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class ReportEndpointTests
{
    private static async Task<Guid> AddBattleAsync(IServiceProvider services, Guid gameId)
    {
        using var scope = services.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<GameRepository>();
        var row = ReportRecorder.RowsFor(gameId, [new GameEvent(9, "BattleResolved", new Dictionary<string, string> { ["planet"] = "p1" })])[0];
        await repo.AddReportAsync(row);

        return row.Id;
    }

    private static HttpRequestMessage Get(CreateGameResponse game, string path) =>
        LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/{path}", game.PlayerToken);

    [PostgresFact]
    public async Task Lists_the_reports_of_the_game()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        await AddBattleAsync(factory.Services, game.GameId);
        var reports = await (await client.SendAsync(Get(game, "reports"))).Content.ReadFromJsonAsync<List<BattleReport>>();
        Assert.Single(reports!);
        Assert.Equal(9, reports![0].Time);
    }

    [PostgresFact]
    public async Task Gets_one_report_by_id()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var id = await AddBattleAsync(factory.Services, game.GameId);
        var report = await (await client.SendAsync(Get(game, $"reports/{id}"))).Content.ReadFromJsonAsync<BattleReport>();
        Assert.Equal(id.ToString(), report!.Id);
    }

    [PostgresFact]
    public async Task Unknown_report_is_404()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await client.SendAsync(Get(game, $"reports/{Guid.NewGuid()}"));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [PostgresFact]
    public async Task Reports_need_a_token_of_the_game()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var other = await LobbyApiFactory.CreateGameAsync(client);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/games/{game.GameId}/reports")).StatusCode);
        var wrong = LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{game.GameId}/reports", other.PlayerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(wrong)).StatusCode);
    }
}
