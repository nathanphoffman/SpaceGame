using static SpaceGame.Core.Tests.VisibilityFixture;

namespace SpaceGame.Core.Tests;

public class SpottedTests
{
    [Fact]
    public void SpottedIsAnnouncedOnceWithItsPayload()
    {
        var state = GameWithFleet(EnemyAt(PlanetInSystem(SystemAtHops(3)), PlanetInSystem(SystemAtHops(1))));
        var (next, events) = FleetFixture.Engine.Advance(state, 10, new SeqDice());
        var (_, again) = FleetFixture.Engine.Advance(next, 20, new SeqDice());
        var spotted = events.Single(e => e.Kind == "FleetSpotted");

        Assert.Equal("e1", spotted.Data["fleet"]);
        Assert.Equal("5000", spotted.Data["arrivesAt"]);
        Assert.Equal("1", spotted.Data["strength"]);
        Assert.DoesNotContain(again, e => e.Kind == "FleetSpotted");
    }

    [Fact]
    public void ThreeNeighboursPerSystem()
    {
        Assert.Equal(1 + StarHops.NeighbourCount, StarHops.Within(SolId, 1).Count);
        Assert.True(StarHops.Within(SolId, 2).Count > StarHops.Within(SolId, 1).Count);
    }
}
