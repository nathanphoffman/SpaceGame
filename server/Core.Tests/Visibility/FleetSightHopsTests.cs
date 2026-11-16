using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class FleetSightHopsTests
{
    private static FleetView ViewOf(ShipType type)
    {
        var from = StartingKit.EarthId;
        var fleet = new Fleet(new FleetId("f1"), FleetFixture.Me, from, from, 0, 0, 5000,
            new Dictionary<ShipType, int> { [type] = 1 }, Resources.Zero);

        return fleet.ToView();
    }

    [Theory]
    [InlineData(ShipType.Scout, 2)]
    [InlineData(ShipType.Fighter, 1)]
    [InlineData(ShipType.Hauler, 1)]
    [InlineData(ShipType.Dreadnought, 1)]
    public void FleetSightDependsOnShipType(ShipType type, int hops) => Assert.Equal(hops, ViewOf(type).SightHops);

    [Fact]
    public void SightHopsSurvivesJsonRoundTrip()
    {
        var back = JsonSerializer.Deserialize<FleetView>(JsonSerializer.Serialize(ViewOf(ShipType.Scout)))!;

        Assert.Equal(2, back.SightHops);
    }
}
