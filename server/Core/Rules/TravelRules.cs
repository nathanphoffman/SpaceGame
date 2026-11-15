namespace SpaceGame.Core;

/// <summary>Flight time constants. Distances are in AU inside a system and light years between systems.</summary>
/// <param name="SecondsPerAu">Flight seconds per AU at speed 1.0 (Sun to Pluto, 40 AU, is one hour).</param>
/// <param name="SecondsPerLySquared">Between systems: seconds = this * ly^2 at speed 1.0 (about 4 h to the nearest star).</param>
/// <param name="MinFlightSeconds">Even the shortest hop takes this long.</param>
public sealed record TravelConfig(
    double SecondsPerAu = TravelConfig.DefaultSecondsPerAu,
    double SecondsPerLySquared = TravelConfig.DefaultSecondsPerLySquared,
    long MinFlightSeconds = 1)
{
    private const double DefaultSecondsPerAu = 90;
    private const double DefaultSecondsPerLySquared = 750;
}

/// <summary>Pure travel-time rules, kept free of state so the server and the simulator quote the same trips.</summary>
public static class TravelRules
{
    /// <summary>Speed of a fleet: its slowest ship, times the Engines upgrade bonus.</summary>
    public static double FleetSpeed(Catalog catalog, IReadOnlyDictionary<ShipType, int> ships, int enginesLevel)
    {
        // Speeds of the ship types actually sent, used to find the slowest.
        var counted = ships.Where(ship => ship.Value > 0).Select(ship => catalog.Ship(ship.Key).Speed).ToList();

        if (counted.Count == 0) return 0;
        var bonus = 1 + catalog.Upgrade(UpgradeType.Engines).BonusPerLevel * enginesLevel;

        return counted.Min() * bonus;
    }

    /// <summary>Flight seconds inside one system.</summary>
    public static long FlightSecondsInSystem(TravelConfig config, double au, double speed) =>
        Math.Max(config.MinFlightSeconds, (long)Math.Round(config.SecondsPerAu * au / speed));

    /// <summary>Interstellar legs scale with distance squared so long jumps stay costly.</summary>
    public static long FlightSecondsBetweenSystems(TravelConfig config, double lightYears, double speed) =>
        Math.Max(config.MinFlightSeconds, (long)Math.Round(config.SecondsPerLySquared * lightYears * lightYears / speed));

    /// <summary>The trip timer: prep first, then the flight.</summary>
    public static FlightQuote Quote(long nowSeconds, long prepSeconds, long flightSeconds) =>
        new(true, null, nowSeconds + prepSeconds, nowSeconds + prepSeconds + flightSeconds);
}
