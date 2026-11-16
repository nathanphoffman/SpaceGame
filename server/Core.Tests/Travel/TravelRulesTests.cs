namespace SpaceGame.Core.Tests;

public class TravelRulesTests
{
    private static readonly Catalog C = Catalog.Default;
    private static readonly TravelConfig T = new();
    private const long Prep = 300;

    private static IReadOnlyDictionary<ShipType, int> Ships(params (ShipType, int)[] ships) =>
        ships.ToDictionary(x => x.Item1, x => x.Item2);

    [Theory]
    [InlineData(ShipType.Scout, 3, ShipType.Dreadnought, 1, 0.6)] // slowest ship sets the pace
    [InlineData(ShipType.Scout, 1, ShipType.Dreadnought, 0, 3.0)] // zero-count ships do not slow the fleet
    public void FleetSpeedFollowsSlowestShip(ShipType a, int na, ShipType b, int nb, double expected) =>
        Assert.Equal(expected, TravelRules.FleetSpeed(C, Ships((a, na), (b, nb))), 6);

    [Fact]
    public void EmptyFleetHasNoSpeed() => Assert.Equal(0, TravelRules.FleetSpeed(C, Ships()));

    [Theory]
    [InlineData(40, 1000, 3500, 3700, 1300)] // Sun to Pluto: about an hour plus prep
    [InlineData(0.00257, 0, 0, 60, 300)] // Earth to Moon: about five minutes
    public void InSystemTripsTakePrepPlusFlight(double au, long launch, long minFlight, long maxFlight, long departAt)
    {
        var flight = TravelRules.FlightSecondsInSystem(T, au, 1.0);
        var quote = TravelRules.Quote(launch, Prep, flight);
        Assert.Equal(departAt, quote.DepartAt);
        Assert.Equal(departAt + flight, quote.ArriveAt);

        if (maxFlight > minFlight) Assert.InRange(flight, minFlight, maxFlight);
    }

    [Fact]
    public void FasterShipsArriveSooner()
    {
        var slow = TravelRules.FlightSecondsInSystem(T, 10, 1.0);
        var fast = TravelRules.FlightSecondsInSystem(T, 10, 2.0);
        Assert.Equal(slow / 2, fast);
    }

    [Theory]
    [InlineData(4.4, 3.5, 4.5)] // nearest star: about four hours
    [InlineData(11, 24, 48)] // far enemy home: one to two days
    public void BetweenSystemTripsTakeHours(double lightYears, double minHours, double maxHours) =>
        Assert.InRange(TravelRules.FlightSecondsBetweenSystems(T, lightYears, 1.0), minHours * 3600, maxHours * 3600);

    [Fact]
    public void BetweenSystemTimeGrowsWithTheSquareOfTheDistance()
    {
        var one = TravelRules.FlightSecondsBetweenSystems(T, 3, 1.0);
        var two = TravelRules.FlightSecondsBetweenSystems(T, 6, 1.0);
        Assert.Equal(one * 4, two);
    }

    [Fact]
    public void ZeroDistanceStillTakesTheMinimum() =>
        Assert.Equal(T.MinFlightSeconds, TravelRules.FlightSecondsInSystem(T, 0, 1.0));
}
