namespace SpaceGame.Core.Tests;

public class EnemyAttackTests
{
    private static readonly PlayerId Me = new("p1");

    // Another planet of Earth's own system, so Earth is always within the enemy's sight.
    private static readonly PlanetId Colony = StarCatalog.Systems.Single(s => s.Id == WorldDistance.SystemOf(StartingKit.EarthId)).Planets.First(p => p.Id != StartingKit.EarthId).Id;

    private static IReadOnlyDictionary<ShipType, int> Fighters(int count) => new Dictionary<ShipType, int> { [ShipType.Fighter] = count };

    // A game where the enemy owns `Colony` with a parked fleet, and the player's Earth base has `defenders` fighters.
    private static GameState Setup(int attackers, int defenders)
    {
        var state = GameEngineFactory.Create().NewGame(new GameSetup(1, [new PlayerSetup(Me, "Ann")], new GameConfig()));
        var earth = state.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!;
        var fleet = new Fleet(new FleetId("e1"), EnemyConfig.Owner, Colony, Colony, 0, 0, 0, Fighters(attackers), Resources.Zero, Parked: true, Side: Side.Enemy);

        return state.WithPlayer(state.PlayerById(Me)!.WithHolding(earth with { Ships = Fighters(defenders) }))
            with
        { EnemyPlanets = [Colony], Fleets = [fleet], EnemyHome = Colony };
    }

    [Fact]
    public void Attacks_WhenAtLeastOneAndAHalfTimesAsStrong()
    {
        var attack = EnemyAttack.Choose(Setup(attackers: 15, defenders: 10));

        Assert.Equal(StartingKit.EarthId, attack!.Target);
    }

    [Fact]
    public void Waits_WhenNotStrongEnough()
    {
        Assert.Null(EnemyAttack.Choose(Setup(attackers: 10, defenders: 10)));
    }

    [Fact]
    public void Waits_WhenItCannotSeeAnyPlayerPlanet()
    {
        var state = Setup(15, 0) with { EnemyPlanets = [] };

        Assert.Null(EnemyAttack.Choose(state));
    }

    [Fact]
    public void Attack_SendsTheFleetTowardsTheTarget()
    {
        var state = Setup(15, 0) with { Config = new GameConfig { Enemy = new EnemyConfig(TickSeconds: 100) } };
        var next = GameEngineFactory.Create().Advance(state, 100, new SeqDice()).State;
        var fleet = next.Fleets.Single(f => f.Id == new FleetId("e1"));

        Assert.False(fleet.Parked);
        Assert.Equal(StartingKit.EarthId, fleet.To);
        Assert.True(fleet.ArriveAt > fleet.DepartAt);
    }

    [Fact]
    public void Choice_IsTheSameEveryTime()
    {
        Assert.Equal(EnemyAttack.Choose(Setup(20, 5)), EnemyAttack.Choose(Setup(20, 5)));
    }
}
