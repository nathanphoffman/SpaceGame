namespace SpaceGame.Core.Tests;

public class EarthAttackScheduleTests
{
    private static readonly EnemyConfig Config = new();
    private const long Hour = 3600;

    private static GameState Game(int players)
    {
        var setup = Enumerable.Range(1, players).Select(i => new PlayerSetup(new PlayerId($"p{i}"), $"P{i}")).ToList();

        return GameEngineFactory.Create().NewGame(new GameSetup(1, setup, new GameConfig()));
    }

    [Fact]
    public void NothingBeforeHour36()
    {
        Assert.Null(EarthAttackSchedule.Due(Game(1), 36 * Hour - 1));
    }

    [Fact]
    public void FirstAttackAtHour36IsFightersOnly()
    {
        var state = Game(1);
        var next = GameEngineFactory.Create().Advance(state, 36 * Hour, new SeqDice()).State;
        var fleet = next.Fleets.Single(f => f.Side == Side.Enemy && f.To == StartingKit.EarthId);

        Assert.Equal(1, next.EarthAttacksSent);
        Assert.Equal([ShipType.Fighter], fleet.Ships.Keys);
        Assert.Equal(Config.FirstEarthAttackFighters, fleet.Ships[ShipType.Fighter]);
    }

    [Fact]
    public void NextAttackComesAnIntervalLater()
    {
        var state = Game(1) with { EarthAttacksSent = 1 };

        Assert.Null(EarthAttackSchedule.Due(state, 36 * Hour + 17 * Hour));
        Assert.NotNull(EarthAttackSchedule.Due(state, 54 * Hour));
    }

    [Fact]
    public void EachFleetIsAboutOnePointThreeFiveTimesTheLast()
    {
        var sizes = Enumerable.Range(0, 4).Select(i => EarthAttackSchedule.Fighters(Config, i, 1)).ToList();

        Assert.Equal([6, 8, 11, 15], sizes);
    }

    [Fact]
    public void EachExtraPlayerAddsTwentyFivePercent()
    {
        Assert.Equal(6, EarthAttackSchedule.Fighters(Config, 0, 1));
        Assert.Equal(8, EarthAttackSchedule.Fighters(Config, 0, 2));
        Assert.Equal(9, EarthAttackSchedule.Fighters(Config, 0, 3));
    }

    [Fact]
    public void ThirdAttackIsDueAtHour72()
    {
        var state = Game(1) with { EarthAttacksSent = 2 };

        Assert.Null(EarthAttackSchedule.Due(state, 72 * Hour - 1));
        Assert.Equal(11, EarthAttackSchedule.Due(state, 72 * Hour)!.Fighters);
    }
}
