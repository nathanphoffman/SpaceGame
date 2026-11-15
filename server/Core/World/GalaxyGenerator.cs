namespace SpaceGame.Core;

/// <summary>The generated world of one game: all systems, the enemy home world and the objective planets.</summary>
public sealed record Galaxy(
    IReadOnlyList<WorldStar> Systems,
    WorldPlanet EnemyHome,
    IReadOnlyList<WorldPlanet> Objectives)
{
    public bool IsObjective(PlanetId id) => Objectives.Any(o => o.Id == id);

    public GalaxyMap ToMap() => new(
        Systems.Select(ToInfo).ToList(),
        EnemyHome.Id);

    private SystemInfo ToInfo(WorldStar star) => new(
        star.Id, star.Name, star.X, star.Y, 0,
        star.Planets.Select(p => new PlanetInfo(p.Id, p.Name, IsObjective(p.Id), RichnessOf(p))).ToList());

    private static Dictionary<Element, int> RichnessOf(WorldPlanet planet) =>
        Enum.GetValues<Element>().ToDictionary(e => e, planet.Richness.Of);
}

/// <summary>Builds the galaxy for a seed: the catalogued systems, the enemy home and the objective planets.</summary>
public static class GalaxyGenerator
{
    public const int ObjectiveCount = 10;
    public const int MinObjectiveSystems = 6;
    private const double NearFraction = 0.30;
    private const double FarFraction = 0.70;

    public static Galaxy Generate(int seed)
    {
        var systems = StarCatalog.Systems;
        var enemyStar = systems.MaxBy(s => s.LightYears)!;
        var enemyHome = enemyStar.Planets.MaxBy(p => p.DiameterKm)!;
        var objectives = PickObjectives(systems, enemyStar, new Random(seed));

        return new Galaxy(systems, enemyHome, objectives);
    }

    /// <summary>True when the system lies 30% to 70% of the way (by distance from Sol, along the route) to the enemy home.</summary>
    public static bool InObjectiveBand(WorldStar star, WorldStar enemyStar)
    {
        var total = Distance(StarCatalog.Sol, enemyStar);
        var fraction = Distance(StarCatalog.Sol, star) / total;

        return fraction is >= NearFraction and <= FarFraction;
    }

    public static double Distance(WorldStar a, WorldStar b) => Math.Sqrt(Math.Pow(a.X - b.X, 2) + Math.Pow(a.Y - b.Y, 2));

    private static List<WorldPlanet> PickObjectives(IReadOnlyList<WorldStar> systems, WorldStar enemyStar, Random random)
    {
        var pools = systems
            .Where(s => s.Planets.Count > 0 && InObjectiveBand(s, enemyStar))
            .OrderBy(_ => random.Next())
            .Select(s => new Queue<WorldPlanet>(s.Planets.OrderBy(_ => random.Next())))
            .ToList();

        var picked = new List<WorldPlanet>();
        while (picked.Count < ObjectiveCount && pools.Any(p => p.Count > 0))
        {
            foreach (var pool in pools.Where(p => p.Count > 0).Take(ObjectiveCount - picked.Count))
            {
                picked.Add(pool.Dequeue());
            }
        }

        return picked;
    }
}
