namespace SpaceGame.Core;

internal static partial class FleetBattles
{
    private static List<BattleShip> ShipsOf(
        GameState state, PlayerId owner, Side side, IReadOnlyDictionary<ShipType, int> ships, IReadOnlyDictionary<ShipType, int> damage)
    {
        var player = state.PlayerById(owner);

        // Sorted by type so ships expand in a stable order; each type becomes one ship per count, carrying its damage.
        return [.. ships.OrderBy(s => s.Key).SelectMany(s =>
            ShipDamage.Expand(StatsOf(state, player, side, s.Key), s.Value, damage.GetValueOrDefault(s.Key)))];
    }

    // Reads the upgraded stats directly so battle code does not chain through StatsOf for one number.
    private static int FullHp(GameState state, PlayerId owner, Side side, ShipType type)
    {
        var player = state.PlayerById(owner);

        return side == Side.Team && player is not null
            ? Upgrades.BattleShipFor(state.Config.Catalog, player, type).Hp
            : state.Config.Catalog.Ship(type).Hp;
    }

    private static BattleShip StatsOf(GameState state, PlayerState? player, Side side, ShipType type)
    {
        if (side == Side.Team && player is not null) return Upgrades.BattleShipFor(state.Config.Catalog, player, type);
        var spec = state.Config.Catalog.Ship(type);

        return new BattleShip(type, spec.HitsOn, spec.Shots, spec.Hp);
    }

    // Counts the surviving ships of each type.
    private static Dictionary<ShipType, int> Count(BattleSide side) =>
        side.Ships.GroupBy(s => s.Type).ToDictionary(g => g.Key, g => g.Count());
}
