using System.Net.Http.Json;

namespace SpaceGame.Server.Discord;

/// <summary>Posts alerts to a game's Discord webhook. Never throws: Discord being down must not fail a request.</summary>
public interface IDiscordNotifier
{
    Task FleetSpottedAsync(string webhookUrl, string targetPlanetId, long arrivesAtGameTime, string strengthHint);
}

public sealed class DiscordNotifier(HttpClient http, ILogger<DiscordNotifier> log) : IDiscordNotifier
{
    public static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(5);

    public async Task FleetSpottedAsync(string webhookUrl, string targetPlanetId, long arrivesAtGameTime, string strengthHint)
    {
        var content = $"Incoming fleet ({strengthHint}) heading for {targetPlanetId}, arrives at game time {arrivesAtGameTime}s.";

        try
        {
            using var response = await http.PostAsJsonAsync(webhookUrl, new { content });

            if (!response.IsSuccessStatusCode)
            {
                log.LogWarning("Discord webhook answered {Status}", (int)response.StatusCode);
            }
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or InvalidOperationException or UriFormatException)
        {
            // Only the type is logged: the message of these exceptions can contain the webhook URL.
            log.LogWarning("Discord webhook failed ({Error})", e.GetType().Name);
        }
    }
}

/// <summary>Sends one Discord message per FleetSpotted event.</summary>
public static class DiscordAlerts
{
    public static async Task SendAsync(IDiscordNotifier discord, string? webhookUrl, IReadOnlyList<SpaceGame.Core.GameEvent> events)
    {
        if (string.IsNullOrEmpty(webhookUrl))
        {
            return;
        }

        foreach (var spotted in events.Where(e => e.Kind == Game.EventNotifications.FleetSpottedKind))
        {
            await discord.FleetSpottedAsync(webhookUrl, Read(spotted, "planet"), ReadTime(spotted), Read(spotted, "strength"));
        }
    }

    private static string Read(SpaceGame.Core.GameEvent e, string key) => e.Data.TryGetValue(key, out var value) ? value : "";

    private static long ReadTime(SpaceGame.Core.GameEvent e) => long.TryParse(Read(e, "arrivesAt"), out var time) ? time : 0;
}
