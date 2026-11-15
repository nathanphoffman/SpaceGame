using SpaceGame.Core;

namespace SpaceGame.Core.Tests;

public class ResourcesTests
{
    [Fact]
    public void AddAndCover()
    {
        var sum = new Resources(1, 2, 3, 4) + new Resources(1, 1, 1, 1);
        Assert.Equal(new Resources(2, 3, 4, 5), sum);
        Assert.True(sum.Covers(new Resources(2, 3, 4, 5)));
        Assert.False(sum.Covers(new Resources(3, 0, 0, 0)));
    }
}
