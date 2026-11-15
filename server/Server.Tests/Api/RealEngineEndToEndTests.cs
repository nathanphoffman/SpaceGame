using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

/// <summary>Runs the whole flow against Core's real engine (not the fake), to catch contract mismatches.</summary>
[Trait("Category", "Postgres")]
public class RealEngineEndToEndTests
{
    private const int WaitSeconds = 600;

    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private sealed record Match(WebApplicationFactory<Program> Factory, HttpClient Client, FakeClock Time, CreateGameResponse Host, JoinGameResponse Guest);

    private static async Task<Match> PlayingAsync()
    {
        var time = new FakeClock(Start);
        var factory = (await LobbyApiFactory.CreateAsync()).WithWebHostBuilder(b =>
            b.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<IClock>(time))));
        var client = factory.CreateClient();
        var host = await LobbyApiFactory.CreateGameAsync(client);
        var code = host.Code;
        var join = await client.PostAsJsonAsync("/api/games/join", new JoinGameRequest(code, "Guest"));
        join.EnsureSuccessStatusCode();
        var guest = (await join.Content.ReadFromJsonAsync<JoinGameResponse>())!;
        var started = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{host.GameId}/start", host.PlayerToken));
        started.EnsureSuccessStatusCode();

        return new Match(factory, client, time, host, guest);
    }

    private static async Task<PlayerView> StateAsync(Match m, Guid gameId, string token)
    {
        var response = await m.Client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, $"/api/games/{gameId}/state", token));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<PlayerView>())!;
    }

    private static async Task<CommandResult> CommandAsync(Match m, object body)
    {
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{m.Host.GameId}/commands", m.Host.PlayerToken);
        request.Content = JsonContent.Create(body);
        var response = await m.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<CommandResult>())!;
    }

    [PostgresFact]
    public async Task Each_player_starts_with_a_home_base_and_stockpile()
    {
        var m = await PlayingAsync();
        await using var _ = m.Factory;
        var view = await StateAsync(m, m.Host.GameId, m.Host.PlayerToken);
        var guestView = await StateAsync(m, m.Host.GameId, m.Guest.PlayerToken);
        Assert.Single(view.OwnPlanets);
        Assert.Single(guestView.OwnPlanets);
        Assert.True(view.Stockpile.Iron > 0);
    }

    [PostgresFact]
    public async Task Queued_ships_are_paid_for_and_the_clock_moves_the_game_on()
    {
        var m = await PlayingAsync();
        await using var _ = m.Factory;
        var before = await StateAsync(m, m.Host.GameId, m.Host.PlayerToken);
        var home = before.OwnPlanets[0].Value;
        var result = await CommandAsync(m, new { type = "queueShip", planet = home, shipType = "Fighter", count = 1 });
        Assert.True(result.Ok, result.Error);

        m.Time.Advance(TimeSpan.FromSeconds(WaitSeconds));
        await m.Factory.Services.GetRequiredService<GameClock>().TickAsync();
        var after = await StateAsync(m, m.Host.GameId, m.Host.PlayerToken);
        Assert.True(after.GameTime >= WaitSeconds);
        Assert.True(after.Version > before.Version);
    }

    [PostgresFact]
    public async Task A_refused_command_comes_back_as_ok_false_with_a_sentence()
    {
        var m = await PlayingAsync();
        await using var _ = m.Factory;
        var result = await CommandAsync(m, new { type = "colonize", planet = "nowhere" });
        Assert.False(result.Ok);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }

    [PostgresFact]
    public async Task Quote_and_map_answer_for_the_real_engine()
    {
        var m = await PlayingAsync();
        await using var _ = m.Factory;
        var map = await m.Client.GetAsync($"/api/games/{m.Host.GameId}/map");
        Assert.Equal(HttpStatusCode.OK, map.StatusCode);
        var request = LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{m.Host.GameId}/quote", m.Host.PlayerToken);
        request.Content = JsonContent.Create(new { from = "nowhere", to = "elsewhere", ships = new Dictionary<string, int> { ["Scout"] = 1 } });
        var quote = await m.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, quote.StatusCode);
        Assert.False((await quote.Content.ReadFromJsonAsync<FlightQuote>())!.Ok);
    }
}
