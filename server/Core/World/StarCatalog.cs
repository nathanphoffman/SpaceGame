namespace SpaceGame.Core;

/// <summary>The ~24 star systems closest to Sol with their planets, built once from the raw tables.</summary>
public static class StarCatalog
{
    public static readonly IReadOnlyList<WorldStar> Systems = BuildAllStars();

    public static WorldStar Sol => Systems[0];

    public static WorldPlanet Earth => Sol.Planets.Single(p => p.Name == "Earth");

    private static List<WorldStar> BuildAllStars() =>
        StarTable.Rows.Select((row, index) => BuildStar(row, index + 1)).ToList();

    private static WorldStar BuildStar(StarTable.Row row, int number)
    {
        var systemId = new SystemId($"s{number}");
        var (x, y) = GalacticCoordinates.ToPlane(row.RaH, row.RaM, row.DecD, row.DecM, row.LightYears);

        return new WorldStar(systemId, row.Name, row.Spectral, x, y, row.LightYears, PlanetsOf(row.Name, systemId, number));
    }

    private static List<WorldPlanet> PlanetsOf(string star, SystemId system, int number)
    {
        var bodies = star == "Sol"
            ? SolBodies.All.Select(b => (b.Name, b.OrbitAu, b.Kind, b.DiameterKm, Composition.Parse(b.Composition)))
            : ExoplanetTable.All.Where(p => p.Star == star)
                .Select(p => (p.Name, p.OrbitAu, p.Kind, p.DiameterKm, Composition.DefaultFor(p.Kind)));

        return bodies.Select((body, index) =>
        {
            var planetId = new PlanetId($"p{number * PlanetsPerSystemBlock + index + 1}");

            return new WorldPlanet(planetId, system, body.Name, body.OrbitAu, body.Kind, body.DiameterKm, body.Item5);
        }).ToList();
    }

    private const int PlanetsPerSystemBlock = 100;
}
