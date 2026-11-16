namespace SpaceGame.Core;

/// <summary>One side of a battle: the ships on it, with the damage they carry.</summary>
public sealed record BattleSide(IReadOnlyList<BattleShip> Ships);

/// <summary>A ship in a battle.</summary>
/// <param name="HitsOn">Roll needed to hit (0 for no weapons).</param>
public sealed record BattleShip(ShipType Type, int HitsOn, int Shots, int Hp);

/// <summary>The outcome of <see cref="BattleResolver.Resolve"/>.</summary>
public sealed record BattleResult(bool AttackersWon, int Rounds, BattleSide Attackers, BattleSide Defenders);

/// <summary>The dice battle rules. Used by the engine and the simulator.</summary>
public static class BattleResolver
{
    private const int MinHitNumber = 2; // a roll of 1 always misses

    /// <summary>
    /// Fights simultaneous rounds until a side has no ships left (or nobody can hit anymore).
    /// <paramref name="defenderBonus"/> lowers the defenders' needed roll. If both sides are wiped out
    /// in the same round, or nobody has weapons, the attackers have not won.
    /// </summary>
    public static BattleResult Resolve(BattleSide attackers, BattleSide defenders, int defenderBonus, IDice dice)
    {
        var att = attackers.Ships.ToList();
        var def = defenders.Ships.ToList();
        var rounds = 0;

        while (att.Count > 0 && def.Count > 0 && (HasWeapons(att) || HasWeapons(def)))
        {
            var hitsOnDefenders = CountHits(att, 0, dice);
            var hitsOnAttackers = CountHits(def, defenderBonus, dice);

            def = ApplyHits(def, hitsOnDefenders);
            att = ApplyHits(att, hitsOnAttackers);
            rounds++;
        }

        return new BattleResult(att.Count > 0 && def.Count == 0, rounds, new BattleSide(att), new BattleSide(def));
    }

    private static bool HasWeapons(List<BattleShip> ships) => ships.Any(IsArmed);

    private static bool IsArmed(BattleShip ship) => ship.HitsOn > 0 && ship.Shots > 0;

    // Rolls each armed ship's shots and counts how many hit.
    private static int CountHits(List<BattleShip> ships, int bonus, IDice dice)
    {
        var hits = 0;

        foreach (var ship in ships.Where(IsArmed))
        {
            var needed = Math.Max(MinHitNumber, ship.HitsOn - bonus);

            for (var shot = 0; shot < ship.Shots; shot++)

                if (dice.Roll() >= needed) hits++;
        }

        return hits;
    }

    /// <summary>Unarmed ships soak hits first, then Fighters, Battleships, Dreadnoughts.</summary>
    private static List<BattleShip> ApplyHits(List<BattleShip> ships, int hits)
    {
        // Unarmed ships come first so they absorb hits before the fighters; ties are ordered by type.
        var ordered = ships.OrderBy(ship => IsArmed(ship) ? 1 : 0).ThenBy(ship => ship.Type).ToList();
        var survivors = new List<BattleShip>();

        foreach (var ship in ordered)
        {
            var taken = Math.Min(hits, ship.Hp);
            hits -= taken;

            if (ship.Hp > taken) survivors.Add(ship with { Hp = ship.Hp - taken });
        }

        return survivors;
    }
}
