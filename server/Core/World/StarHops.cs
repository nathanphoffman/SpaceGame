namespace SpaceGame.Core;

/// <summary>Star hops: one hop is the same system or one of its nearest neighbours.</summary>
public static class StarHops
{
    public const int NeighbourCount = 3;

    // Each system's nearest neighbours, built once from the catalog.
    private static readonly Dictionary<SystemId, IReadOnlyList<SystemId>> Neighbours =
        StarCatalog.Systems.ToDictionary(star => star.Id, NearestTo);

    private static IReadOnlyList<SystemId> NearestTo(WorldStar star) =>
        [.. StarCatalog.Systems.Where(other => other.Id != star.Id)
            .OrderBy(other => GalaxyGenerator.Distance(star, other)).ThenBy(other => other.Id.Value, StringComparer.Ordinal)
            .Take(NeighbourCount).Select(other => other.Id)];

    /// <summary>Every system within <paramref name="hops"/> hops of <paramref name="origin"/>, the origin included.</summary>
    public static HashSet<SystemId> Within(SystemId origin, int hops)
    {
        var seen = new HashSet<SystemId> { origin };
        var edge = new List<SystemId> { origin };

        for (var step = 0; step < hops; step++)
        {
            edge = [.. edge.SelectMany(id => Neighbours[id]).Where(seen.Add)];
        }

        return seen;
    }
}
