namespace SpaceGame.Core;

/// <summary>Ships that defend a planet: a parked fleet, or the ships of a player's base.</summary>
internal sealed record Garrison(
    Fleet? Fleet, PlayerId? BaseOwner, IReadOnlyDictionary<ShipType, int> Ships, IReadOnlyDictionary<ShipType, int> Damage)
{
    public PlayerId Owner => Fleet?.Owner ?? BaseOwner!.Value;
}

/// <summary>Fights the battle when a fleet arrives at a planet that the other side holds ships on.</summary>
internal static partial class FleetBattles
{
    private static Side Opposite(Side side) => side == Side.Team ? Side.Enemy : Side.Team;

    /// <summary>True when ships of the other side wait at the fleet's destination.</summary>
    public static bool HasDefenders(GameState state, Fleet attacker) => Defenders(state, attacker).Count > 0;

    /// <summary>
    /// Resolves the battle (the attacker is already removed from the state). Survivors of both sides stay;
    /// an attacker with ships left lands as usual.
    /// </summary>
    public static GameState Fight(GameState state, Fleet attacker, List<GameEvent> events, IDice dice)
    {
        var planet = attacker.To;
        var defenders = Defenders(state, attacker);
        var defenderSide = Opposite(attacker.Side);
        var attackSide = new BattleSide(ShipsOf(state, attacker.Owner, attacker.Side, attacker.Ships, attacker.Damage));
        var defendSide = new BattleSide([.. defenders.SelectMany(g => ShipsOf(state, g.Owner, defenderSide, g.Ships, g.Damage))]);
        var bonus = attacker.Side == Side.Enemy && HasDefenseBuilding(state, planet) ? state.Config.DefenseBonus : 0;
        var result = BattleResolver.Resolve(attackSide, defendSide, bonus, dice);

        events.Add(ReportEvent(attacker, attackSide, defendSide, result));
        var after = Survive(state, planet, defenders, result.Defenders, defenderSide, attacker.ArriveAt);
        var left = Count(result.Attackers);
        var hurt = ShipDamage.Tally(result.Attackers, type => FullHp(state, attacker.Owner, attacker.Side, type));
        var landed = left.Count == 0
            ? after
            : FleetArrivals.Land(after, attacker with { Ships = left, Damage = hurt }, planet, attacker.ArriveAt, events);

        return EnemyTookEarth(attacker, planet, result) ? Endgame.End(landed, Side.Enemy, Endgame.EarthLostReason, attacker.ArriveAt, events) : landed;
    }

    private static bool EnemyTookEarth(Fleet attacker, PlanetId planet, BattleResult result) =>
        attacker.Side == Side.Enemy && planet == StartingKit.EarthId && result.AttackersWon;
}
