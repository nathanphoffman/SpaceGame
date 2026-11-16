using static SpaceGame.Core.Tests.VisibilityFixture;

namespace SpaceGame.Core.Tests;

public class VisibilityTests
{
    [Theory]
    [InlineData(1, false, true)] // aimed at a home neighbour: seen
    [InlineData(2, true, false)] // two hops away without a scout: hidden
    [InlineData(2, false, true)] // a scout at home sees two hops
    [InlineData(3, true, false)] // far away: hidden
    public void EnemySeenByDistanceAndScout(int targetHops, bool withoutScout, bool seen)
    {
        var state = GameWithFleet(EnemyAt(PlanetInSystem(SystemAtHops(3)), PlanetInSystem(SystemAtHops(targetHops))));
        Assert.Equal(seen, Sees(withoutScout ? WithoutScout(state) : state));
    }
}
