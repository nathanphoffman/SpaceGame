namespace SpaceGame.Core.Tests;

public class EnemyReasonTests
{
    private static readonly IGameEngine Engine = GameEngineFactory.Create();
    private const long Hour = 3600;

    private static GameState NewGame(EnemyConfig enemy) =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(new PlayerId("p1"), TestNames.Ann)], new GameConfig { Enemy = enemy }));

    [Fact]
    public void EveryOrderOverManyTicksHasAReason()
    {
        var enemy = new EnemyConfig(IncomePerPlanetPerTick: 1000, FirstEarthAttackSeconds: Hour * 3);
        var state = NewGame(enemy);

        for (var tick = 1; tick <= 8; tick++)
        {
            var orders = EnemyBrain.Decide(state, new SeqDice(), tick * Hour);

            Assert.All(orders, o => Assert.False(string.IsNullOrWhiteSpace(o.Reason), o.GetType().Name));
            state = Engine.Advance(state, tick * Hour, new SeqDice()).State;
        }
    }

    [Fact]
    public void AdvanceKeepsEachOrdersReasonInAnEvent()
    {
        var state = NewGame(new EnemyConfig(IncomePerPlanetPerTick: 1000));

        var events = Engine.Advance(state, Hour, new SeqDice()).Events.Where(e => e.Kind == "EnemyOrder").ToList();

        Assert.NotEmpty(events);
        Assert.All(events, e => Assert.False(string.IsNullOrWhiteSpace(e.Data[TestNames.Reason])));
    }

    [Fact]
    public void EarthAttackOrderHasAReason()
    {
        var state = NewGame(new EnemyConfig());
        var order = EarthAttackSchedule.Due(state, state.Config.Enemy.FirstEarthAttackSeconds);

        Assert.False(string.IsNullOrWhiteSpace(order!.Reason));
    }
}
