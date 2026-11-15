using static SpaceGame.Core.Tests.UpgradeFixture;

namespace SpaceGame.Core.Tests;

public class UpgradeStartTests
{
    [Fact]
    public void StartTakesCostAndSetsResearch()
    {
        var (state, r) = Start(Game(), UpgradeType.Engines);
        Assert.True(r.Ok);
        Assert.Equal(new Resources(0, 0, 960, 990), Me_(state).Stock.Amount);
        Assert.Equal(2 * Hour, Me_(state).Research!.FinishAt);
    }

    [Fact]
    public void UnknownPlayerRejected() =>
        Assert.Equal("You are not in this game.",
            GameEngineFactory.Create().Apply(Game(), new PlayerId("x"), new StartUpgrade(UpgradeType.Armor), 0).Result.Error);

    [Fact]
    public void NotEnoughResourcesRejected() =>
        Assert.Equal("Not enough resources.", Start(Game(new Resources(0, 0, 10, 0)), UpgradeType.Weapons).Result.Error);

    [Fact]
    public void OnlyOneResearchAtATime()
    {
        var (state, _) = Start(Game(), UpgradeType.Engines);
        Assert.Equal("Another upgrade is already being researched.", Start(state, UpgradeType.Armor).Result.Error);
    }

    [Fact]
    public void CompletionRaisesLevelAndRespectsCap()
    {
        var state = Game();

        for (var level = 1; level <= 3; level++)
        {
            state = Finish(Start(state, UpgradeType.Engines, (level - 1) * 10 * Hour).State, level * 10 * Hour - 5 * Hour);
            Assert.Equal(level, Me_(state).UpgradeLevel(UpgradeType.Engines));
        }

        Assert.Equal("Engines is already at its top level.", Start(state, UpgradeType.Engines, 40 * Hour).Result.Error);
    }
}
