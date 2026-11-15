using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class FleetDamageTests
{
    private static readonly PlayerId EnemyId = new("enemy");
    private const long HalfHour = 1800;

    private sealed class ScriptedDice(params int[] rolls) : IDice
    {
        private int _next;

        public int Roll() => rolls[_next++ % rolls.Length];
    }

    private static Dictionary<ShipType, int> Ships(ShipType type, int count) => new() { [type] = count };

    private static Fleet EnemyFleet(ShipType type, PlanetId to, long arriveAt, bool parked) =>
        new(new FleetId("e1"), EnemyId, Target, to, 0, 0, arriveAt, Ships(type, 1), Resources.Zero, Parked: parked, Side: Side.Enemy);

    private static Fleet TeamBattleship(PlanetId to, long arriveAt, int damage = 0) =>
        new(new FleetId("t1"), Me, StartingKit.EarthId, to, 0, 0, arriveAt, Ships(ShipType.Battleship, 1), Resources.Zero)
        { Damage = Ships(ShipType.Battleship, damage) };

    private static Holding Earth(GameState state) => state.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!;

    private static GameState EarthWithDamagedBattleship(bool shipyard)
    {
        var state = FleetGame();
        var holding = Earth(state) with
        {
            HasShipyard = shipyard,
            Ships = Ships(ShipType.Battleship, 1),
            Damage = Ships(ShipType.Battleship, 3),
        };

        return state.WithPlayer(state.PlayerById(Me)!.WithHolding(holding));
    }

    [Fact]
    public void SurvivingAttackerKeepsTheHitsItTook()
    {
        var state = FleetGame() with { Fleets = [TeamBattleship(Target, 100), EnemyFleet(ShipType.Battleship, Target, 0, true)] };

        // Round 1: we hit twice (enemy at 2 hp), they hit once (we are at 3 hp). Round 2: we finish them.
        var (after, _) = Engine.Advance(state, 100, new ScriptedDice(6, 6, 6, 1, 6, 6, 1, 1));
        var fleet = Assert.Single(after.Fleets);
        Assert.Equal(1, fleet.Damage[ShipType.Battleship]);
    }

    [Fact]
    public void ArrivingAtABaseAddsTheDamageToIt()
    {
        var state = FleetGame() with { Fleets = [TeamBattleship(StartingKit.EarthId, 100, damage: 2)] };
        var (after, _) = Engine.Advance(state, 100, new ScriptedDice(1));
        Assert.Equal(2, Earth(after).Damage[ShipType.Battleship]);
        Assert.Equal(100, Earth(after).DamagedAt);
    }

    [Fact]
    public void ShipyardHealsBeforeTheNextBattle()
    {
        var state = EarthWithDamagedBattleship(shipyard: true) with { Fleets = [EnemyFleet(ShipType.Fighter, StartingKit.EarthId, HalfHour, false)] };

        // Half an hour heals 2 of the 3 lost hp, so the hit leaves the Battleship at 2 hp (damage 2).
        var (after, _) = Engine.Advance(state, HalfHour, new ScriptedDice(6, 6, 6));
        Assert.Equal(2, Earth(after).Damage[ShipType.Battleship]);
    }

    [Fact]
    public void WithoutAShipyardTheShipStaysDamagedAndDies()
    {
        var state = EarthWithDamagedBattleship(shipyard: false) with { Fleets = [EnemyFleet(ShipType.Fighter, StartingKit.EarthId, HalfHour, false)] };
        var (after, _) = Engine.Advance(state, HalfHour, new ScriptedDice(6, 6, 6));
        Assert.Empty(Earth(after).Ships);
    }
}
