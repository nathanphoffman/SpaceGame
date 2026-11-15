namespace SpaceGame.Core;

/// <summary>The generated world of one game: all systems, the enemy home world and the objective planets.</summary>
public sealed record Galaxy(
    IReadOnlyList<WorldStar> Systems,
    WorldPlanet EnemyHome,
    IReadOnlyList<WorldPlanet> Objectives)
{
    // True when the planet is one of the chosen objectives.
    public bool IsObjective(PlanetId planetId) => Objectives.Any(objective => objective.Id == planetId);

    public GalaxyMap ToMap() => new(
        Systems.Select(ToInfo).ToList(),
        EnemyHome.Id);

    // Converts a star and its planets into the client-facing shape.
    private SystemInfo ToInfo(WorldStar star) => new(
        star.Id, star.Name, star.X, star.Y, 0,
        star.Planets.Select(p => new PlanetInfo(p.Id, p.Name, IsObjective(p.Id), RichnessOf(p))).ToList());

    // Richness of every element on the planet.
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

    public static double Distance(WorldStar from, WorldStar to) => Math.Sqrt(Math.Pow(from.X - to.X, 2) + Math.Pow(from.Y - to.Y, 2));

    private static List<WorldPlanet> PickObjectives(IReadOnlyList<WorldStar> systems, WorldStar enemyStar, Random random)
    {
        // Shuffle systems and each system's planets so objectives are picked randomly but reproducibly from the seed.
        var pools = systems
            // Only stars with planets inside the objective distance band qualify.
            .Where(s => s.Planets.Count > 0 && InObjectiveBand(s, enemyStar))
            // Shuffle the stars.
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
