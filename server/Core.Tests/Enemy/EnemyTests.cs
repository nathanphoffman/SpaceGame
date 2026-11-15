using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class EnemyTests
{
    private static readonly IGameEngine Engine = GameEngineFactory.Create();
    private static readonly IDice Dice = new SeqDice();
    private const long Hour = 3600;

    private static readonly EnemyConfig Rich = new(IncomePerPlanetPerTick: 1000);

    private static GameState NewGame(EnemyConfig? enemy = null) =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(new PlayerId("p1"), "Ann")], new GameConfig { Enemy = enemy ?? new EnemyConfig() }));

    private static GameState AdvanceEnemyState(GameState state, long nowSeconds) => Engine.Advance(state, nowSeconds, Dice).State;

    [Fact]
    public void FirstTick_ParksTheHomeGarrisonAtTheEnemyHome()
    {
        var state = AdvanceEnemyState(NewGame(), Hour);

        Assert.Equal(state.Config.Enemy.HomeGarrisonFighters, EnemyBrain.HomeFighters(state));
    }

    [Fact]
    public void Tick_AddsIncomePerOwnedPlanetToTheBudget()
    {
        var config = new EnemyConfig(HomeGarrisonFighters: 0, EscortFighters: 100);
        var state = AdvanceEnemyState(NewGame(config), Hour);

        Assert.Equal(config.IncomePerPlanetPerTick, state.EnemyBudget);
        Assert.Equal(Hour, state.EnemyLastTick);
    }

    [Fact]
    public void Garrison_RegrowsFromTheBudgetAfterLosses()
    {
        var config = new EnemyConfig(EscortFighters: 100);
        var state = AdvanceEnemyState(NewGame(config), Hour);
        var home = state.Fleets.Single();
        var weakened = state with { Fleets = [home with { Ships = new Dictionary<ShipType, int> { [ShipType.Fighter] = 7 }, }] };

        Assert.Equal(config.HomeGarrisonFighters, EnemyBrain.HomeFighters(AdvanceEnemyState(weakened, 2 * Hour)));
    }

    [Fact]
    public void Garrison_NeverGrowsPastTheTarget()
    {
        var state = AdvanceEnemyState(NewGame(), 5 * Hour);

        Assert.Equal(state.Config.Enemy.HomeGarrisonFighters, EnemyBrain.HomeFighters(state));
    }

    [Fact]
    public void Expedition_LaunchesOnceTheBudgetCoversColonyAndEscort()
    {
        var state = AdvanceEnemyState(NewGame(Rich), 3 * Hour);
        var launched = state.Fleets.Single(f => !f.Parked);

        Assert.Equal(Side.Enemy, launched.Side);
        Assert.Equal(1, launched.Ships[ShipType.Colony]);
        Assert.Equal(state.Config.Enemy.EscortFighters, launched.Ships[ShipType.Fighter]);
    }

    [Fact]
    public void Expedition_HeadsForTheUnclaimedSystemNearestEarth()
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
    public void Colony_ClaimsThePlanetOnArrivalAndKeepsTheEscortThere()
    {
        var launched = AdvanceEnemyState(NewGame(Rich), 3 * Hour);
        var fleet = launched.Fleets.Single(f => !f.Parked);
        var state = AdvanceEnemyState(launched, fleet.ArriveAt + Hour);

        Assert.Contains(fleet.To, state.EnemyPlanets);
        Assert.Contains(state.Fleets, f => f.Parked && f.To == fleet.To && !f.Ships.ContainsKey(ShipType.Colony));
    }

    [Fact]
    public void Advance_IsDeterministicForTheSameSeed()
    {
        var first = JsonSerializer.Serialize(AdvanceEnemyState(NewGame(), 40 * Hour));
        var second = JsonSerializer.Serialize(AdvanceEnemyState(NewGame(), 40 * Hour));

        Assert.Equal(first, second);
    }

    [Fact]
    public void EnemyState_RoundTripsThroughJson()
    {
        var state = AdvanceEnemyState(NewGame(Rich), 3 * Hour);
        var copy = JsonSerializer.Deserialize<GameState>(JsonSerializer.Serialize(state))!;

        Assert.Equal(state.EnemyBudget, copy.EnemyBudget);
        Assert.Equal(state.Fleets.Count, copy.Fleets.Count);
    }
}
