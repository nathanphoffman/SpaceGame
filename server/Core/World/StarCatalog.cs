namespace SpaceGame.Core;

/// <summary>The ~24 star systems closest to Sol with their planets, built once from the raw tables.</summary>
public static class StarCatalog
{
    public static readonly IReadOnlyList<WorldStar> Systems = Build();

    public static WorldStar Sol => Systems[0];

    public static WorldPlanet Earth => Sol.Planets.Single(p => p.Name == "Earth");

    private static List<WorldStar> Build() =>
        StarTable.Rows.Select((row, index) => BuildStar(row, index + 1)).ToList();

    private static WorldStar BuildStar(StarTable.Row row, int number)
    {
        var id = new SystemId($"s{number}");
        var (x, y) = GalacticCoordinates.ToPlane(row.RaH, row.RaM, row.DecD, row.DecM, row.LightYears);

        return new WorldStar(id, row.Name, row.Spectral, x, y, row.LightYears, PlanetsOf(row.Name, id, number));
    }

    private static List<WorldPlanet> PlanetsOf(string star, SystemId system, int number)
    {
        var planets = new List<WorldPlanet>();
        var rows = star == "Sol" ? SolPlanets() : ExoPlanets(star);
        foreach (var (name, orbit, kind, km, richness) in rows)
        {
            var id = new PlanetId($"p{number * PlanetsPerSystemBlock + planets.Count + 1}");
            planets.Add(new WorldPlanet(id, system, name, orbit, kind, km, richness));
        }

        return planets;
    }

    private const int PlanetsPerSystemBlock = 100;

    private static IEnumerable<(string, double, PlanetKind, int, Richness)> SolPlanets() =>
        SolBodies.All.Select(b => (b.Name, b.OrbitAu, b.Kind, b.DiameterKm, Composition.Parse(b.Composition)));

    private static IEnumerable<(string, double, PlanetKind, int, Richness)> ExoPlanets(string star) =>
        ExoplanetTable.All.Where(p => p.Star == star)
            .Select(p => (p.Name, p.OrbitAu, p.Kind, p.DiameterKm, Composition.DefaultFor(p.Kind)));
}
