namespace SpaceGame.Core.Tests;

public class TravelRulesTests
{
    private static readonly Catalog C = Catalog.Default;
    private static readonly TravelConfig T = new();
    private const long Prep = 300;

    private static IReadOnlyDictionary<ShipType, int> Ships(params (ShipType, int)[] ships) =>
        ships.ToDictionary(x => x.Item1, x => x.Item2);

    [Fact]
    public void FleetMovesAtItsSlowestShip()
    {
        var speed = TravelRules.FleetSpeed(C, Ships((ShipType.Scout, 3), (ShipType.Dreadnought, 1)), 0);
        Assert.Equal(0.6, speed, 6);
    }

    [Fact]
    public void ZeroCountShipsDoNotSlowTheFleet()
    {
        var speed = TravelRules.FleetSpeed(C, Ships((ShipType.Scout, 1), (ShipType.Dreadnought, 0)), 0);
        Assert.Equal(3.0, speed, 6);
    }

    [Fact]
    public void EmptyFleetHasNoSpeed() => Assert.Equal(0, TravelRules.FleetSpeed(C, Ships(), 0));

    [Fact]
    public void EnginesRaiseSpeed()
    {
        var speed = TravelRules.FleetSpeed(C, Ships((ShipType.Hauler, 1)), 2);
        Assert.Equal(1.5, speed, 6);
    }

    [Fact]
    public void SunToPlutoIsAboutOneHourPlusPrep()
    {
        var flight = TravelRules.FlightSecondsInSystem(T, 40, 1.0);
        Assert.InRange(flight, 3500, 3700);
        var quote = TravelRules.Quote(1000, Prep, flight);
        Assert.Equal(1300, quote.DepartAt);
        Assert.Equal(1300 + flight, quote.ArriveAt);
    }

    [Fact]
    public void EarthToMoonIsAboutFiveMinutes()
    {
        var flight = TravelRules.FlightSecondsInSystem(T, 0.00257, 1.0);
        var quote = TravelRules.Quote(0, Prep, flight);
        Assert.InRange(quote.ArriveAt, 300, 360);
    }

    [Fact]
    public void FasterShipsArriveSooner()
    {
        var slow = TravelRules.FlightSecondsInSystem(T, 10, 1.0);
        var fast = TravelRules.FlightSecondsInSystem(T, 10, 2.0);
        Assert.Equal(slow / 2, fast);
    }

    [Fact]
    public void NearestStarIsAboutFourHours()
    {
        var flight = TravelRules.FlightSecondsBetweenSystems(T, 4.4, 1.0);
        Assert.InRange(flight, 3.5 * 3600, 4.5 * 3600);
    }

    [Fact]
    public void BetweenSystemTimeGrowsWithTheSquareOfTheDistance()
    {
        var one = TravelRules.FlightSecondsBetweenSystems(T, 3, 1.0);
        var two = TravelRules.FlightSecondsBetweenSystems(T, 6, 1.0);
        Assert.Equal(one * 4, two);
    }

    [Fact]
    public void FarEnemyHomeTakesOneToTwoDays()
    {
        var flight = TravelRules.FlightSecondsBetweenSystems(T, 11, 1.0);
        Assert.InRange(flight, 24 * 3600, 48 * 3600);
    }

    [Fact]
    public void ZeroDistanceStillTakesTheMinimum() =>
        Assert.Equal(T.MinFlightSeconds, TravelRules.FlightSecondsInSystem(T, 0, 1.0));
}
