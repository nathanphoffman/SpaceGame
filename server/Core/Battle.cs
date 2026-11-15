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
    /// <summary>Fights until one side has no ships left. <paramref name="defenderBonus"/> lowers the defenders' needed roll.</summary>
    public static BattleResult Resolve(BattleSide attackers, BattleSide defenders, int defenderBonus, IDice dice) =>
        throw new NotImplementedException("Core milestone a.");
}
