namespace SpaceGame.Core;

/// <summary>Distances between catalogued planets: AU inside a system, light years between systems.</summary>
public static class WorldDistance
{
    private static readonly Dictionary<PlanetId, (WorldStar Star, WorldPlanet Planet)> Index =
        StarCatalog.Systems.SelectMany(s => s.Planets.Select(p => (p.Id, (s, p)))).ToDictionary(x => x.Id, x => x.Item2);

    public static bool Exists(PlanetId id) => Index.ContainsKey(id);

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
