using System.Net;
using Microsoft.Extensions.Logging;
using SpaceGame.Core;
using SpaceGame.Server.Discord;

namespace SpaceGame.Server.Tests;

/// <summary>Discord does nothing; used where alerts do not matter.</summary>
public sealed class NoDiscord : IDiscordNotifier
{
    public Task FleetSpottedAsync(string webhookUrl, string targetPlanetId, long arrivesAtGameTime, string strengthHint) => Task.CompletedTask;
}

public class DiscordNotifierTests
{
    private const string Webhook = "https://discord.test/api/webhooks/123/secret-token";

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Bodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));

            return respond(request);
        }
    }

    private sealed class CapturingLogger : ILogger<DiscordNotifier>
    {
        public List<string> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Lines.Add(formatter(state, exception) + exception);
    }

    private sealed class RecordingDiscord : IDiscordNotifier
    {
        public List<string> Calls { get; } = [];

        public Task FleetSpottedAsync(string webhookUrl, string targetPlanetId, long arrivesAtGameTime, string strengthHint)
        {
            Calls.Add($"{webhookUrl}|{targetPlanetId}|{arrivesAtGameTime}|{strengthHint}");

            return Task.CompletedTask;
        }
    }

    private static GameEvent Spotted(string planet) =>
        new(1, "FleetSpotted", new Dictionary<string, string> { ["planet"] = planet, ["arrivesAt"] = "900", ["strength"] = "large" });

    [Fact]
    public async Task Posts_the_alert_text_to_the_webhook()
    {
        var handler = new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.NoContent));
        var notifier = new DiscordNotifier(new HttpClient(handler), new CapturingLogger());
        await notifier.FleetSpottedAsync(Webhook, "p2", 900, "large");
        var body = Assert.Single(handler.Bodies);
        Assert.Contains("p2", body);
        Assert.Contains("900", body);
        Assert.Contains("large", body);
    }

    [Fact]
    public async Task A_network_failure_does_not_throw_and_the_url_is_not_logged()
    {
        var handler = new FakeHandler(_ => throw new HttpRequestException($"cannot reach {Webhook}"));
        var logger = new CapturingLogger();
        await new DiscordNotifier(new HttpClient(handler), logger).FleetSpottedAsync(Webhook, "p2", 900, "large");
        Assert.NotEmpty(logger.Lines);
        Assert.DoesNotContain(logger.Lines, line => line.Contains("secret-token"));
    }

    [Fact]
    public async Task An_error_status_does_not_throw_and_the_url_is_not_logged()
    {
        var handler = new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var logger = new CapturingLogger();
        await new DiscordNotifier(new HttpClient(handler), logger).FleetSpottedAsync(Webhook, "p2", 900, "large");
        Assert.DoesNotContain(logger.Lines, line => line.Contains("secret-token"));
    }

    [Fact]
    public async Task Sends_one_message_per_spotted_event()
    {
        var discord = new RecordingDiscord();
        await DiscordAlerts.SendAsync(discord, Webhook, [Spotted("p1"), new GameEvent(1, "Tick", new Dictionary<string, string>()), Spotted("p2")]);
        Assert.Equal([$"{Webhook}|p1|900|large", $"{Webhook}|p2|900|large"], discord.Calls);
    }

    [Fact]
    public async Task Sends_nothing_without_a_webhook()
    {
        var discord = new RecordingDiscord();
        await DiscordAlerts.SendAsync(discord, null, [Spotted("p1")]);
        Assert.Empty(discord.Calls);
    }
}
