namespace SpaceGame.Core.Tests;

public class BattleResolverTests
{
    private sealed class ScriptedDice(params int[] rolls) : IDice
    {
        private int _next;

        public int Roll() => rolls[_next++];
    }

    private static BattleShip BattleShipOf(ShipType type) =>
        Catalog.Default.Ship(type) is var s ? new BattleShip(type, s.HitsOn, s.Shots, s.Hp) : throw new InvalidOperationException();

    private static BattleSide Side(params ShipType[] types) => new(types.Select(BattleShipOf).ToList());

    [Fact]
    public void OneOnOneFightersBothHitBothDieAttackersDoNotWin()
    {
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 0, new ScriptedDice(5, 6));
        Assert.False(r.AttackersWon);
        Assert.Equal(1, r.Rounds);
        Assert.Empty(r.Attackers.Ships);
        Assert.Empty(r.Defenders.Ships);
    }

    [Fact]
    public void RollOfOneAlwaysMisses()
    {
        // Round 1: both miss (1 and 4). Round 2: attacker hits (5), defender misses (2).
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 0, new ScriptedDice(1, 4, 5, 2));
        Assert.True(r.AttackersWon);
        Assert.Equal(2, r.Rounds);
        Assert.Single(r.Attackers.Ships);
    }

    [Fact]
    public void DefenderBonusLowersNeededRollButNeverBelowTwo()
    {
        // Fighter hits on 5; with bonus 1 it hits on 4. Attacker rolls 1 (miss), defender rolls 4 (hit).
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 1, new ScriptedDice(1, 4));
        Assert.False(r.AttackersWon);
        Assert.Empty(r.Attackers.Ships);
        Assert.Single(r.Defenders.Ships);

        // Huge bonus: needed roll stays 2, so a 1 still misses and a 2 hits.
        var r2 = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 9, new ScriptedDice(1, 1, 1, 2));
        Assert.Empty(r2.Attackers.Ships);
        Assert.Equal(2, r2.Rounds);
    }

    [Fact]
    public void DreadnoughtAgainstFighterSwarmDamagePersistsAcrossRounds()
    {
        var fighters = Enumerable.Repeat(ShipType.Fighter, 4).ToArray();

        // Round 1: Dread rolls 3,3,3,3,3 (5 hits, kills 4 fighters + 1 spare hit lost); fighters roll 5,5,5,1 (3 hits).
        var r = BattleResolver.Resolve(Side(ShipType.Dreadnought), Side(fighters), 0,
            new ScriptedDice(3, 3, 3, 3, 3, 5, 5, 5, 1));
        Assert.True(r.AttackersWon);
        Assert.Equal(1, r.Rounds);
        Assert.Equal(7, r.Attackers.Ships.Single().Hp);
    }

    [Fact]
    public void HitsPreferUnarmedShips()
    {
        // If round 1's two hits went to the Battleship, the Fighter would outlive round 3.
        var def = Side(ShipType.Battleship, ShipType.Fighter, ShipType.Hauler);
        var r = BattleResolver.Resolve(Side(ShipType.Fighter, ShipType.Fighter), def, 0,
            new ScriptedDice([5, 5, 1, 1, 1, 5, 5, 1, 1, 5, 5, 1, 1]));
        Assert.True(r.AttackersWon);
        Assert.Equal(3, r.Rounds);
        Assert.Equal(2, r.Attackers.Ships.Count);
    }

    [Fact]
    public void DrawOutCountsEveryRound()
    {
        // Battleships hit on 4+; each has 4 HP and 2 shots. Both sides hit once per round: dead in 4 rounds? 1 hit/round = 4 rounds.
        var dice = new ScriptedDice([4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1]);
        var r = BattleResolver.Resolve(Side(ShipType.Battleship), Side(ShipType.Battleship), 0, dice);
        Assert.Equal(4, r.Rounds);
        Assert.False(r.AttackersWon);
        Assert.Empty(r.Attackers.Ships);
        Assert.Empty(r.Defenders.Ships);
    }

    [Fact]
    public void AlliedShipsFightTogetherAsOneSide()
    {
        // Round 1: the two defending Fighters both hit the Battleship. Round 2: it kills them.
        var r = BattleResolver.Resolve(Side(ShipType.Battleship), Side(ShipType.Fighter, ShipType.Fighter), 0,
            new ScriptedDice(1, 1, 5, 5, 4, 4, 1, 1));
        Assert.True(r.AttackersWon);
        Assert.Equal(2, r.Attackers.Ships.Single().Hp);
    }

    [Theory]
    [InlineData(ShipType.Scout, ShipType.Hauler, false, 0)] // nobody armed: stops without a winner
    [InlineData(ShipType.Fighter, ShipType.Hauler, true, 1)] // unarmed defenders are destroyed
    public void UnarmedDefendersNeverFightBack(ShipType attacker, ShipType defender, bool attackersWon, int rounds)
    {
        var r = BattleResolver.Resolve(Side(attacker), Side(defender), 0, new ScriptedDice(6));
        Assert.Equal((attackersWon, rounds), (r.AttackersWon, r.Rounds));
    }
}
