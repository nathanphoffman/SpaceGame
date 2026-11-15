namespace SpaceGame.Core.Tests;

public class StockpileTests
{
    private static readonly Catalog C = Catalog.Default;
    private const int Hour = 3600;
    private static readonly Resources IronRate = MineOutput.RateFor(Element.Iron, MineOutput.MilliPerHour(C, 1, 100, 0));

    [Theory]
    [InlineData(1, 100, 0, 20_000)] // level 1 on a rich planet
    [InlineData(1, 50, 0, 10_000)] // richness scales output
    [InlineData(2, 100, 0, 26_000)] // +30% per mine level
    [InlineData(3, 100, 0, 33_800)]
    [InlineData(1, 100, 1, 26_000)] // +30% per mining upgrade level
    [InlineData(1, 100, 3, 38_000)]
    public void MineOutputScalesWithRichnessAndLevels(int level, int richness, int upgrade, long expected) =>
        Assert.Equal(expected, MineOutput.MilliPerHour(C, level, richness, upgrade));

    [Fact]
    public void RateForFillsOnlyTheChosenElement()
    {
        Assert.Equal(new Resources(0, 0, 0, 5), MineOutput.RateFor(Element.Helium3, 5));
        Assert.Equal(new Resources(0, 5, 0, 0), MineOutput.RateFor(Element.Hydrogen, 5));
        Assert.Equal(new Resources(0, 0, 5, 0), MineOutput.RateFor(Element.Titanium, 5));
    }

    [Fact]
    public void SeveralHoursGiveWholeUnits()
    {
        var stock = Stockpile.Open(new Resources(300, 0, 0, 0), 0).AdvanceTo(5 * Hour, IronRate);
        Assert.Equal(400, stock.Amount.Iron);
        Assert.Equal(5 * Hour, stock.Time);
    }

    [Fact]
    public void ManySmallStepsEqualOneBigStep()
    {
        var start = Stockpile.Open(Resources.Zero, 0);
        var stepped = start;

        for (var t = 7; t <= 6 * Hour; t += 7) stepped = stepped.AdvanceTo(t, IronRate);
        stepped = stepped.AdvanceTo(6 * Hour, IronRate);
        Assert.Equal(start.AdvanceTo(6 * Hour, IronRate), stepped);
    }

    [Fact]
    public void FractionsAreCarriedNotLost()
    {
        var rate = MineOutput.RateFor(Element.Iron, MineOutput.MilliPerHour(C, 1, 10, 0)); // 2 per hour
        var stock = Stockpile.Open(Resources.Zero, 0);

        for (var t = 1; t <= 3 * Hour; t++) stock = stock.AdvanceTo(t, rate);
        Assert.Equal(6, stock.Amount.Iron);
        Assert.Equal(0, stock.Carry.Iron);
    }

    [Fact]
    public void AcrossLevelChangesEachStretchUsesItsOwnRate()
    {
        var level2 = MineOutput.RateFor(Element.Iron, MineOutput.MilliPerHour(C, 2, 100, 0));
        var stock = Stockpile.Open(Resources.Zero, 0).AdvanceTo(2 * Hour, IronRate); // 40
        stock = stock.AdvanceTo(4 * Hour, level2); // +52
        Assert.Equal(92, stock.Amount.Iron);
    }

    [Fact]
    public void AdvancingToAnEarlierTimeChangesNothing()
    {
        var stock = Stockpile.Open(new Resources(5, 5, 5, 5), 100);
        Assert.Same(stock, stock.AdvanceTo(100, IronRate));
        Assert.Same(stock, stock.AdvanceTo(50, IronRate));
    }

    [Fact]
    public void SpendChangesOnlyTheAmount()
    {
        var stock = Stockpile.Open(new Resources(100, 50, 0, 0), 10).Spend(new Resources(40, 0, 0, 0)).Add(new Resources(0, 5, 1, 1));
        Assert.Equal(new Resources(60, 55, 1, 1), stock.Amount);
        Assert.Equal(10, stock.Time);
    }

    [Fact]
    public void AllFourElementsAccrueTogether()
    {
        var rate = new Resources(1000, 2000, 3000, 4000);
        var stock = Stockpile.Open(Resources.Zero, 0).AdvanceTo(Hour, rate);
        Assert.Equal(new Resources(1, 2, 3, 4), stock.Amount);
    }
}
