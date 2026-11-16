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

    [Theory]
    [InlineData(0, 36 * Hour - 1, false)]
    [InlineData(1, 36 * Hour + 17 * Hour, false)] // next one comes an interval later
    [InlineData(1, 54 * Hour, true)]
    [InlineData(2, 72 * Hour - 1, false)]
    [InlineData(2, 72 * Hour, true)]
    public void AttackIsDueOnSchedule(int sent, long now, bool due) =>
        Assert.Equal(due, EarthAttackSchedule.Due(Game(1) with { EarthAttacksSent = sent }, now) is not null);

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

    [Theory]
    [InlineData(1, 0, 6)]
    [InlineData(1, 1, 8)] // each fleet is about 1.35 times the last
    [InlineData(1, 2, 11)]
    [InlineData(1, 3, 15)]
    [InlineData(2, 0, 8)] // each extra player adds 25 percent
    [InlineData(3, 0, 9)]
    public void FleetSizeGrowsWithAttacksAndPlayers(int players, int attackIndex, int expected) =>
        Assert.Equal(expected, EarthAttackSchedule.Fighters(Config, attackIndex, players));
}
