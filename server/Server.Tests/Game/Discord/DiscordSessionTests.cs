using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using SpaceGame.Server.Discord;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

/// <summary>Discord alerts as seen from a game session: optional per game, and never able to break a request.</summary>
[Trait("Category", "Postgres")]
public class DiscordSessionTests
{
    private const string Webhook = "https://discord.test/api/webhooks/1/token";

    private sealed class CountingHandler(HttpStatusCode? status) : HttpMessageHandler
    {
        public int Posts { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Posts++;

            return status is { } code
                ? Task.FromResult(new HttpResponseMessage(code))
                : throw new HttpRequestException($"cannot reach {request.RequestUri}");
        }
    }

    private static async Task<(GameSession Session, StoredGame Stored)> StartDiscordGameAsync(string? webhook, CountingHandler handler)
    {
        var stored = await StoredGame.CreateAsync(status: "running", webhook: webhook);
        var discord = new DiscordNotifier(new HttpClient(handler), NullLogger<DiscordNotifier>.Instance);
        var session = SessionFixture.MakeSession(stored, new FakeEngine { EventKind = "FleetSpotted" }, discord);

        return (session, stored);
    }

    [PostgresFact]
    public async Task A_game_with_a_webhook_posts_when_a_fleet_is_spotted()
    {
        var handler = new CountingHandler(HttpStatusCode.NoContent);
        var (session, stored) = await StartDiscordGameAsync(Webhook, handler);
        await session.AdvanceAsync(stored.GameId);
        Assert.Equal(1, handler.Posts);
    }

    [PostgresFact]
    public async Task A_game_without_a_webhook_posts_nothing()
    {
        var handler = new CountingHandler(HttpStatusCode.NoContent);
        var (session, stored) = await StartDiscordGameAsync(null, handler);
        await session.AdvanceAsync(stored.GameId);
        Assert.Equal(0, handler.Posts);
    }

    [PostgresFact]
    public async Task A_failing_webhook_does_not_break_the_request_and_the_state_is_saved()
    {
        var handler = new CountingHandler(null);
        var (session, stored) = await StartDiscordGameAsync(Webhook, handler);
        var snapshot = await session.AdvanceAsync(stored.GameId);
        Assert.Equal(1, handler.Posts);
        Assert.Equal(60, snapshot!.GameTime);
        Assert.Equal(60, (await stored.Repo.LoadAsync(stored.GameId))!.State.Time);
    }
}
