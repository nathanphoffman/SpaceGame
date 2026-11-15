namespace SpaceGame.Core;

/// <summary>Distances between catalogued planets: AU inside a system, light years between systems.</summary>
public static class WorldDistance
{
    private static readonly Dictionary<PlanetId, (WorldStar Star, WorldPlanet Planet)> Index =
        // Index every planet by id, remembering its star, so distance lookups are direct.
        StarCatalog.Systems.SelectMany(system => system.Planets.Select(planet => (planet.Id, (system, planet)))).ToDictionary(entry => entry.Id, entry => entry.Item2);

    /// <summary>The star system a planet orbits in (null for an id that is not in the catalog).</summary>
    public static SystemId? SystemOf(PlanetId planetId) => Index.TryGetValue(planetId, out var entry) ? entry.Star.Id : null;

    public static bool Exists(PlanetId planetId) => Index.ContainsKey(planetId);

    /// <summary>Flight seconds from one planet to another at the given speed.</summary>
    public static long FlightSeconds(TravelConfig config, PlanetId from, PlanetId to, double speed)
    {
        var (fromStar, fromPlanet) = Index[from];
        var (toStar, toPlanet) = Index[to];

        return fromStar.Id == toStar.Id
            ? TravelRules.FlightSecondsInSystem(config, Math.Abs(fromPlanet.OrbitAu - toPlanet.OrbitAu), speed)
            : TravelRules.FlightSecondsBetweenSystems(config, GalaxyGenerator.Distance(fromStar, toStar), speed);
    }
}
