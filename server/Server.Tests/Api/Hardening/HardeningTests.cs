using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Core;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

/// <summary>Counts every applied command in the state, so a lost update shows up as a missing count.</summary>
internal sealed class CountingEngine : IGameEngine
{
    private readonly FakeEngine inner = new();

    public GameState NewGame(GameSetup setup) => inner.NewGame(setup);

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long now, IDice dice) => (state, []);

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long now) =>
        (state with { Time = state.Time + 1 }, new CommandResult(true, null));

    public PlayerView ViewFor(GameState state, PlayerId player, long now) => inner.ViewFor(state, player, now);

    public GalaxyMap Map(GameState state) => inner.Map(state);

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long now) => inner.Quote(state, player, send, now);
}

[Trait("Category", "Postgres")]
public class HardeningTests
{
    private const int ParallelCommands = 10;
    private static readonly object Colonize = new { type = "colonize", planet = "p1" };

    [PostgresFact]
    public async Task Token_from_another_game_is_403_with_problem_details()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var other = await LobbyApiFactory.CreateGameAsync(client);
        var crossed = new CreateGameResponse(game.GameId, game.Code, other.PlayerId, other.PlayerToken);
        var response = await PlayApi.PostCommandAsync(client, crossed, Colonize);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [PostgresFact]
    public async Task Missing_token_is_401()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await client.GetAsync($"/api/games/{game.GameId}/state");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [PostgresFact]
    public async Task Command_with_an_empty_body_is_400_with_problem_details()
    {
        var (factory, client, game) = await PlayApi.StartedAsync();
        await using var _ = factory;
        var response = await PlayApi.PostCommandAsync(client, game, new { });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [PostgresFact]
    public async Task Parallel_commands_never_lose_a_version()
    {
        var (factory, client, game) = await StartedWithCountingEngineAsync();
        await using var _ = factory;
        var before = await VersionAsync(factory, game);
        var responses = await Task.WhenAll(Enumerable.Range(0, ParallelCommands).Select(_ => PlayApi.PostCommandAsync(client, game, Colonize)));
        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal(before + ParallelCommands, await VersionAsync(factory, game));
    }

    private static async Task<(WebApplicationFactory<Program>, HttpClient, CreateGameResponse)> StartedWithCountingEngineAsync()
    {
        var factory = (await LobbyApiFactory.CreateAsync()).WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IGameEngine>(new CountingEngine()))));
        var client = factory.CreateClient();
        var game = await LobbyApiFactory.CreateGameAsync(client);
        (await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{game.GameId}/start", game.PlayerToken))).EnsureSuccessStatusCode();

        return (factory, client, game);
    }

    private static async Task<long> VersionAsync(WebApplicationFactory<Program> factory, CreateGameResponse game)
    {
        await using var scope = factory.Services.CreateAsyncScope();

        return (await scope.ServiceProvider.GetRequiredService<GameRepository>().LoadAsync(game.GameId))!.Version;
    }
}
