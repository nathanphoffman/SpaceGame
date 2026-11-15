using System.Text.Json;
using SpaceGame.Core;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>Turns BattleResolved events into report rows (the payload is a serialized BattleReport).</summary>
public static class ReportRecorder
{
    public const string BattleKind = "BattleResolved";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static IReadOnlyList<ReportRow> RowsFor(Guid gameId, IEnumerable<GameEvent> events) =>
        // Keep only battle events and turn each into a stored row.
        events.Where(gameEvent => gameEvent.Kind == BattleKind).Select(gameEvent => ToRow(gameId, gameEvent)).ToList();

    public static BattleReport? Parse(ReportRow reportRow) =>
        JsonSerializer.Deserialize<BattleReport>(reportRow.Payload, Json);

    private static ReportRow ToRow(Guid gameId, GameEvent battle)
    {
        var reportId = Guid.NewGuid();
        var report = new BattleReport(reportId.ToString(), battle.Time, new PlanetId(Read(battle, "planet")), Read(battle, "attackersWon") == "true", ReadRounds(battle));

        return new ReportRow { Id = reportId, GameId = gameId, GameTime = battle.Time, Kind = BattleKind, Payload = JsonSerializer.Serialize(report, Json) };
    }

    private static string Read(GameEvent gameEvent, string key) => gameEvent.Data.TryGetValue(key, out var value) ? value : "";

    private static int ReadRounds(GameEvent gameEvent) => int.TryParse(Read(gameEvent, "rounds"), out var rounds) ? rounds : 0;
}
