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
    public void ADefenderMissIsRolledAgainOncePerReroll()
    {
        // Fighters hit on 5. The attacker rolls 1 (miss). The defender rolls 2 (miss), rerolls and gets 5 (hit).
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 1, new ScriptedDice(1, 2, 5));
        Assert.False(r.AttackersWon);
        Assert.Empty(r.Attackers.Ships);
        Assert.Single(r.Defenders.Ships);
        Assert.Equal(1, r.Rounds);
    }

    [Fact]
    public void EachRerollLevelGivesOneMoreChance()
    {
        // With 2 rerolls the defender gets three rolls for the shot: 1, 4, 5 -> the third one hits.
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 2, new ScriptedDice(1, 1, 4, 5));
        Assert.Empty(r.Attackers.Ships);
        Assert.Equal(1, r.Rounds);

        // With only 1 reroll the same two misses end the round and a second round is needed.
        var once = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Fighter), 1, new ScriptedDice(1, 1, 4, 1, 1, 5));
        Assert.Equal(2, once.Rounds);
    }

    [Fact]
    public void AttackersNeverGetRerolls()
    {
        // The attacker's single shot is rolled once: a 4 misses and is not rerolled even though the defenders have levels.
        var r = BattleResolver.Resolve(Side(ShipType.Fighter), Side(ShipType.Scout), 3, new ScriptedDice(4, 5));
        Assert.Equal(2, r.Rounds);
        Assert.True(r.AttackersWon);
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
