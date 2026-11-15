using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>Maps game events (and the saved version) to notifier calls.</summary>
public static class EventNotifications
{
    public const string FleetSpottedKind = "FleetSpotted";
    public const string GameEndedKind = "GameEnded";

    public static async Task PublishAsync(IGameNotifier notifier, Guid gameId, long version, IReadOnlyList<GameEvent> events, IReadOnlyList<ReportRow> reports)
    {
        await notifier.StateChangedAsync(gameId, version);

        foreach (var report in reports)
        {
            await notifier.BattleResolvedAsync(gameId, report.Id.ToString());
        }

        foreach (var spotted in events.Where(e => e.Kind == FleetSpottedKind))
        {
            await notifier.FleetSpottedAsync(gameId, Read(spotted, "fleet"), Read(spotted, "planet"), ReadTime(spotted), Read(spotted, "strength"));
        }

        foreach (var ended in events.Where(e => e.Kind == GameEndedKind))
        {
            await notifier.GameEndedAsync(gameId, Read(ended, "outcome"));
        }
    }

    private static string Read(GameEvent e, string key) => e.Data.TryGetValue(key, out var value) ? value : "";

    private static long ReadTime(GameEvent e) => long.TryParse(Read(e, "arrivesAt"), out var time) ? time : 0;
}
