using static SpaceGame.Core.Tests.VisibilityFixture;

namespace SpaceGame.Core.Tests;

public class VisibilityTests
{
    [Fact]
    public void EnemyAimedAtAHomeNeighbourIsSeen()
    {
        var near = PlanetInSystem(SystemAtHops(1));
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.True(Sees(GameWithFleet(EnemyAt(far, near))));
    }

    [Fact]
    public void EnemyTwoHopsAwayIsHiddenWithoutAScout()
    {
        var two = PlanetInSystem(SystemAtHops(2));
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.False(Sees(WithoutScout(GameWithFleet(EnemyAt(far, two)))));
    }

    [Fact]
    public void ScoutAtHomeSeesTwoHops()
    {
        var two = PlanetInSystem(SystemAtHops(2));
        var far = PlanetInSystem(SystemAtHops(3));
        var state = GameWithFleet(EnemyAt(far, two));
        var scouted = WithEarthShips(state, new Dictionary<ShipType, int> { [ShipType.Scout] = 1 });

        Assert.True(Sees(scouted));
    }

    [Fact]
    public void EnemyFarAwayIsHidden()
    {
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.False(Sees(WithoutScout(GameWithFleet(EnemyAt(far, far)))));
    }
}
