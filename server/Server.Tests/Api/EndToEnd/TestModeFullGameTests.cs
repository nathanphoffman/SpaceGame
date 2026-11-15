using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceGame.Server.Game;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Tests;

/// <summary>Plays a whole test-mode game (1 real hour) on the real engine by moving a fake clock.</summary>
[Trait("Category", "Postgres")]
public class TestModeFullGameTests
{
    private static readonly TimeSpan Step = TimeSpan.FromMinutes(5);
    private const int MaxSteps = 14; // 70 minutes, more than the 1-hour test game

    [PostgresFact]
    public async Task A_test_mode_game_runs_to_its_end_and_reports_the_outcome_once()
    {
        var clock = new FakeClock(StoredGame.StartTime);
        var notifier = new RecordingNotifier();
        await using var factory = (await LobbyApiFactory.CreateAsync()).WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.Replace(ServiceDescriptor.Singleton<IClock>(clock));
            s.Replace(ServiceDescriptor.Singleton<IGameNotifier>(notifier));
        }));

        var client = factory.CreateClient();
        var host = await LobbyApiFactory.CreateGameAsync(client, "test");
        var join = await client.PostAsJsonAsync("/api/games/join", new JoinGameRequest(host.Code, "Guest"));
        join.EnsureSuccessStatusCode();
        (await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Post, $"/api/games/{host.GameId}/start", host.PlayerToken))).EnsureSuccessStatusCode();
        var url = $"/api/games/{host.GameId}/outcome";

        Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, url, host.PlayerToken))).StatusCode);

        var gameClock = factory.Services.GetRequiredService<GameClock>();

        for (var i = 0; i < MaxSteps && notifier.GameEndedOutcomes.Count == 0; i++)
        {
            clock.MoveForward(Step);
            await gameClock.TickAsync();
        }

        // Extra ticks must not announce the end again.
        clock.MoveForward(Step);
        await gameClock.TickAsync();

        var response = await client.SendAsync(LobbyApiFactory.WithToken(HttpMethod.Get, url, host.PlayerToken));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var outcome = (await response.Content.ReadFromJsonAsync<GameOutcome>())!;
        Assert.NotEqual(OutcomeRecorder.Unknown, outcome.Winner);
        Assert.NotEqual(OutcomeRecorder.Unknown, outcome.Reason);
        Assert.Equal(2, outcome.Contributions.Count);
        Assert.Single(notifier.GameEndedOutcomes);
    }
}
