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

    [Fact]
    public void ScoutFleetSeesTwoHops() => Assert.Equal(2, ViewOf(ShipType.Scout).SightHops);

    [Theory]
    [InlineData(ShipType.Fighter)]
    [InlineData(ShipType.Hauler)]
    [InlineData(ShipType.Dreadnought)]
    public void OtherFleetsSeeOneHop(ShipType type) => Assert.Equal(1, ViewOf(type).SightHops);

    [Fact]
    public void SightHopsSurvivesJsonRoundTrip()
    {
        var back = JsonSerializer.Deserialize<FleetView>(JsonSerializer.Serialize(ViewOf(ShipType.Scout)))!;

        Assert.Equal(2, back.SightHops);
    }
}
