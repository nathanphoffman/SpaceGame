using SpaceGame.Core;

namespace SpaceGame.Core.Tests;

public class ResourcesTests
{
    [Fact]
    public void AddSumsEachElement()
    {
        var sum = new Resources(1, 2, 3, 4) + new Resources(1, 1, 1, 1);
        Assert.Equal(new Resources(2, 3, 4, 5), sum);
        Assert.True(sum.Covers(new Resources(2, 3, 4, 5)));
        Assert.False(sum.Covers(new Resources(3, 0, 0, 0)));
    }

    [Fact]
    public void SubtractScaleAndTotalWork()
    {
        var r = new Resources(10, 20, 30, 40);
        Assert.Equal(100, r.Total);
        Assert.False((r - r).HasNegative);
        Assert.True((r - new Resources(11, 0, 0, 0)).HasNegative);
        Assert.Equal(new Resources(15, 30, 45, 60), r.Scale(1.5));
        Assert.Equal(new Resources(20, 40, 60, 80), r * 2);
        Assert.Equal(30, r.Get(Element.Titanium));
    }
}
