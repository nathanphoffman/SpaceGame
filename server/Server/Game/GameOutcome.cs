using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>One player's share of the result.</summary>
public sealed record PlayerContribution(string Player, int Points);

/// <summary>Final result of a finished game, for the end screen.</summary>
public sealed record GameOutcome(string Winner, string Reason, int TeamScore, int EnemyScore, IReadOnlyList<PlayerContribution> Contributions);

/// <summary>
/// Turns the engine's GameEnded event into an outcome and stores it as a report row of its own kind,
/// so the outcome is kept without a new table or a change to the shared GameState.
/// </summary>
public static class OutcomeRecorder
{
    public const string OutcomeKind = "GameEnded";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static ReportRow? RowFor(Guid gameId, IEnumerable<GameEvent> events) =>
        events.FirstOrDefault(e => e.Kind == OutcomeKind) is { } ended
            ? new ReportRow { Id = Guid.NewGuid(), GameId = gameId, GameTime = ended.Time, Kind = OutcomeKind, Payload = JsonSerializer.Serialize(FromEvent(ended), Json) }
            : null;

    public const string Unknown = "unknown";

    /// <summary>Reads a stored outcome; a payload that cannot be read gives an "unknown" outcome, never an error.</summary>
    public static GameOutcome Parse(ReportRow row)
    {
        try
        {
            return JsonSerializer.Deserialize<GameOutcome>(row.Payload, Json) ?? Empty;
        }
        catch (JsonException)
        {
            return Empty;
        }
    }

    private static readonly GameOutcome Empty = new(Unknown, Unknown, 0, 0, []);

    private static GameOutcome FromEvent(GameEvent ended) =>
        new(ReadText(ended, "winner"), ReadText(ended, "reason"), ReadNumber(ended, "teamScore"), ReadNumber(ended, "enemyScore"), ReadContributions(ended));

    // Contributions arrive as a JSON array in the event's string data; bad data gives an empty table instead of an error.
    private static List<PlayerContribution> ReadContributions(GameEvent ended)
    {
        try
        {
            return JsonSerializer.Deserialize<List<PlayerContribution>>(Read(ended, "contributions"), Json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string ReadText(GameEvent e, string key) => Read(e, key) is { Length: > 0 } text ? text : Unknown;

    private static string Read(GameEvent e, string key) => e.Data.TryGetValue(key, out var value) ? value : "";

    private static int ReadNumber(GameEvent e, string key) => int.TryParse(Read(e, key), out var number) ? number : 0;
}
