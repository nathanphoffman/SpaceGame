using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class EnemyTests
{
    private static readonly IGameEngine Engine = GameEngineFactory.Create();
    private static readonly IDice Dice = new SeqDice();
    private const long Hour = 3600;

    private static readonly EnemyConfig Rich = new(IncomePerPlanetPerTick: 1000);

    private static GameState NewGame(EnemyConfig? enemy = null) =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(new PlayerId("p1"), TestNames.Ann)], new GameConfig { Enemy = enemy ?? new EnemyConfig() }));

    [Fact]
    public void FirstTickParksTheHomeGarrisonAtTheEnemyHome()
    {
        var state = Engine.Advance(NewGame(), Hour, Dice).State;

        Assert.Equal(state.Config.Enemy.HomeGarrisonFighters, EnemyBrain.HomeFighters(state));
    }

    [Fact]
    public void TickAddsIncomePerOwnedPlanetToTheBudget()
    {
        var config = new EnemyConfig(HomeGarrisonFighters: 0, EscortFighters: 100);
        var state = Engine.Advance(NewGame(config), Hour, Dice).State;

        Assert.Equal(config.IncomePerPlanetPerTick, state.EnemyBudget);
        Assert.Equal(Hour, state.EnemyLastTick);
    }

    [Fact]
    public void GarrisonRegrowsFromTheBudgetAfterLosses()
    {
        var config = new EnemyConfig(EscortFighters: 100);
        var state = Engine.Advance(NewGame(config), Hour, Dice).State;
        var home = state.Fleets.Single();
        var weakened = state with { Fleets = [home with { Ships = new Dictionary<ShipType, int> { [ShipType.Fighter] = 7 }, }] };

        Assert.Equal(config.HomeGarrisonFighters, EnemyBrain.HomeFighters(Engine.Advance(weakened, 2 * Hour, Dice).State));
    }

    [Fact]
    public void GarrisonNeverGrowsPastTheTarget()
    {
        var state = Engine.Advance(NewGame(), 5 * Hour, Dice).State;

        Assert.Equal(state.Config.Enemy.HomeGarrisonFighters, EnemyBrain.HomeFighters(state));
    }

    [Fact]
    public void ExpeditionLaunchesWhenBudgetCoversCost()
    {
        var state = Engine.Advance(NewGame(Rich), 3 * Hour, Dice).State;
        var launched = state.Fleets.Single(f => !f.Parked);

        Assert.Equal(Side.Enemy, launched.Side);
        Assert.Equal(1, launched.Ships[ShipType.Colony]);
        Assert.Equal(state.Config.Enemy.EscortFighters, launched.Ships[ShipType.Fighter]);
    }

    [Fact]
    public void ExpeditionHeadsForTheUnclaimedSystemNearestEarth()
    {
        var target = EnemyBrain.ExpeditionTarget(NewGame())!.Value;
        var earthSystem = StarCatalog.Systems.Single(s => s.Id == WorldDistance.SystemOf(StartingKit.EarthId));
        var nearest = StarCatalog.Systems.Where(s => s.Id != earthSystem.Id).MinBy(s => GalaxyGenerator.Distance(earthSystem, s))!;

        Assert.NotEqual(earthSystem.Id, WorldDistance.SystemOf(target));
        Assert.Contains(StarCatalog.Systems, s => s.Id == WorldDistance.SystemOf(target));
        Assert.True(GalaxyGenerator.Distance(earthSystem, StarCatalog.Systems.Single(s => s.Id == WorldDistance.SystemOf(target)))
            >= GalaxyGenerator.Distance(earthSystem, nearest) - 1e-9);
    }

    [Fact]
    public void ColonyClaimsThePlanetOnArrival()
    {
        var launched = Engine.Advance(NewGame(Rich), 3 * Hour, Dice).State;
        var fleet = launched.Fleets.Single(f => !f.Parked);
        var state = Engine.Advance(launched, fleet.ArriveAt + Hour, Dice).State;

        Assert.Contains(fleet.To, state.EnemyPlanets);
        Assert.Contains(state.Fleets, f => f.Parked && f.To == fleet.To && !f.Ships.ContainsKey(ShipType.Colony));
    }

    [Fact]
    public void AdvanceIsDeterministicForTheSameSeed()
    {
        var first = JsonSerializer.Serialize(Engine.Advance(NewGame(), 40 * Hour, Dice).State);
        var second = JsonSerializer.Serialize(Engine.Advance(NewGame(), 40 * Hour, Dice).State);

        Assert.Equal(first, second);
    }

    [Fact]
    public void EnemyStateRoundTripsThroughJson()
    {
        var state = Engine.Advance(NewGame(Rich), 3 * Hour, Dice).State;
        var copy = JsonSerializer.Deserialize<GameState>(JsonSerializer.Serialize(state))!;

        Assert.Equal(state.EnemyBudget, copy.EnemyBudget);
        Assert.Equal(state.Fleets.Count, copy.Fleets.Count);
    }
}
