namespace SpaceGame.Core;

/// <summary>
/// Damage that stays on ships after a battle. It is kept as hit points lost per ship type (spread over the stack)
/// so the state stays small; a stack is rebuilt into single ships when it fights again.
/// </summary>
internal static class ShipDamage
{
    /// <summary>The ships of one type, with the lost hit points filled in one ship at a time (a ship keeps at least 1 hp).</summary>
    public static List<BattleShip> Expand(BattleShip full, int count, int lost)
    {
        var ships = new List<BattleShip>();
        var left = lost;

        for (var index = 0; index < count; index++)
        {
            var taken = Math.Min(left, full.Hp - 1);
            left -= taken;
            ships.Add(full with { Hp = full.Hp - taken });
        }

        return ships;
    }

    /// <summary>Hit points lost per type among the survivors, given what each type has when undamaged.</summary>
    public static Dictionary<ShipType, int> Tally(BattleSide survivors, Func<ShipType, int> fullHp) =>
        survivors.Ships.GroupBy(ship => ship.Type)
            // Sum the missing hit points per type.
            .ToDictionary(group => group.Key, group => group.Sum(ship => fullHp(ship.Type) - ship.Hp))
            // Drop types with no damage.
            .Where(pair => pair.Value > 0).ToDictionary(pair => pair.Key, pair => pair.Value);

    /// <summary>A shipyard repairs a stack's whole hit point pool in <see cref="GameConfig.HealSeconds"/>.</summary>
    public static IReadOnlyDictionary<ShipType, int> Healed(
        GameConfig config, Holding holding, Func<ShipType, int> fullHp, long nowSeconds)
    {
        if (!holding.HasShipyard) return holding.Damage;

        var elapsed = Math.Max(0, nowSeconds - holding.DamagedAt);
        var result = new Dictionary<ShipType, int>();

        foreach (var (type, lost) in holding.Damage)
        {
            var count = holding.Ships.GetValueOrDefault(type);
            var repaired = (long)count * fullHp(type) * elapsed / config.HealSeconds;
            var remaining = (int)Math.Max(0, lost - repaired);

            if (remaining > 0) result[type] = remaining;
        }

        return result;
    }

    /// <summary>Adds two damage pools together.</summary>
    public static Dictionary<ShipType, int> Merge(IReadOnlyDictionary<ShipType, int> first, IReadOnlyDictionary<ShipType, int> second)
    {
        var result = first.ToDictionary(pair => pair.Key, pair => pair.Value);

        foreach (var (type, lost) in second) result[type] = result.GetValueOrDefault(type) + lost;

        return result;
    }
}
