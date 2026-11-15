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
        events.Where(e => e.Kind == BattleKind).Select(e => ToRow(gameId, e)).ToList();

    public static BattleReport? Parse(ReportRow row) =>
        JsonSerializer.Deserialize<BattleReport>(row.Payload, Json);

    private static ReportRow ToRow(Guid gameId, GameEvent battle)
    {
        var id = Guid.NewGuid();
        var report = new BattleReport(id.ToString(), battle.Time, new PlanetId(Read(battle, "planet")), Read(battle, "attackersWon") == "true", ReadRounds(battle));

        return new ReportRow { Id = id, GameId = gameId, GameTime = battle.Time, Kind = BattleKind, Payload = JsonSerializer.Serialize(report, Json) };
    }

    private static string Read(GameEvent e, string key) => e.Data.TryGetValue(key, out var value) ? value : "";

    private static int ReadRounds(GameEvent e) => int.TryParse(Read(e, "rounds"), out var rounds) ? rounds : 0;
}
