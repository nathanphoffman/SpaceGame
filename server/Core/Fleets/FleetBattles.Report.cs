namespace SpaceGame.Core;

internal static partial class FleetBattles
{
    // Sorted by type so the same fleet always prints the same text.
    private static string Join(IReadOnlyDictionary<ShipType, int> ships) =>
        string.Join(",", ships.OrderBy(s => s.Key).Select(s => $"{s.Value} {s.Key}"));

    private static GameEvent ReportEvent(Fleet attacker, BattleSide attackSide, BattleSide defendSide, BattleResult result) =>
        new(attacker.ArriveAt, "BattleResolved", new Dictionary<string, string>
        {
            [EventKeys.Planet] = attacker.To.Value,
            [EventKeys.Fleet] = attacker.Id.Value,
            ["attackerSide"] = attacker.Side.ToString(),
            ["attackersWon"] = result.AttackersWon ? "true" : "false",
            ["rounds"] = result.Rounds.ToString(),
            ["attackers"] = Join(Count(attackSide)),
            ["defenders"] = Join(Count(defendSide)),
            ["attackersLeft"] = Join(Count(result.Attackers)),
            ["defendersLeft"] = Join(Count(result.Defenders)),
        });
}
