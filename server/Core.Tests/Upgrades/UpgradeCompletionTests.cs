using static SpaceGame.Core.Tests.UpgradeFixture;

namespace SpaceGame.Core.Tests;

public class UpgradeCompletionTests
{
    [Fact]
    public void LaterLevelsCostMore()
    {
        var state = Finish(Start(Game(), UpgradeType.Mining).State, 3 * Hour);
        var before = Me_(state).Stock.Amount;
        var after = Me_(Start(state, UpgradeType.Mining, 3 * Hour).State).Stock.Amount;
        Assert.Equal(Cat.Upgrade(UpgradeType.Mining).CostAtLevel(2), before - after);
    }

    [Fact]
    public void NotFinishedBeforeItsTime()
    {
        var state = Finish(Start(Game(), UpgradeType.Armor).State, Hour);
        Assert.Equal(0, Me_(state).UpgradeLevel(UpgradeType.Armor));
        Assert.NotNull(Me_(state).Research);
    }

    [Fact]
    public void MiningUpgradeRaisesIncomeFromItsFinishTime()
    {
        var holding = new Holding(Earth) { Mines = new Dictionary<Element, int> { [Element.Iron] = 1 } };
        var state = Game(new Resources(0, 0, 100, 100), holding);
        var started = Start(state, UpgradeType.Mining).State;
        var done = Finish(started, 4 * Hour);

        // 2h at 20/h, then 2h at 26/h
        Assert.Equal(40 + 52, Me_(done).Stock.Amount.Iron);
    }
}
