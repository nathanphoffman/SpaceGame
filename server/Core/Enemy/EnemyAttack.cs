namespace SpaceGame.Core;

/// <summary>Chooses whether the enemy attacks: the weakest player planet it can see, if its fleet is clearly stronger.</summary>
public static class EnemyAttack
{
    /// <summary>An attack order for this tick, or null to wait and build.</summary>
    public static LaunchAttack? Choose(GameState state)
    {
        var catalog = state.Config.Catalog;
        var targets = VisibleTargets(state);

        if (targets.Count == 0) return null;

        var attackers = EnemyBrain.EnemyFleets(state)
            .Where(f => f.Parked && state.EnemyPlanets.Contains(f.To) && !f.Ships.ContainsKey(ShipType.Colony))
            .OrderByDescending(f => Visibility.Strength(catalog, f)).ThenBy(f => f.Id.Value, StringComparer.Ordinal);

        foreach (var fleet in attackers)
        {
            var target = WeakestFor(state, fleet, targets);

            if (Visibility.Strength(catalog, fleet) >= state.Config.Enemy.AttackStrengthRatio * DefenderStrength(state, target)
                && Visibility.Strength(catalog, fleet) > 0) return new LaunchAttack(fleet.Id, target)
                {
                    Reason = $"Fleet {fleet.Id.Value} is clearly stronger than the weakest visible planet {target.Value}.",
                };
        }

        return null;
    }

    // Player-held planets in systems within sight of an enemy planet.
    private static List<PlanetId> VisibleTargets(GameState state)
    {
        var sight = new HashSet<SystemId>();

        foreach (var planet in state.EnemyPlanets)
        {
            if (WorldDistance.SystemOf(planet) is { } system) sight.UnionWith(StarHops.Within(system, state.Config.Enemy.SightHops));
        }

        return [.. state.Players.SelectMany(p => p.Holdings).Select(h => h.Planet).Distinct()
            .Where(p => WorldDistance.SystemOf(p) is { } system && sight.Contains(system))];
    }

    // Least defended first; ties go to the planet closest to the fleet, then by id.
    private static PlanetId WeakestFor(GameState state, Fleet fleet, List<PlanetId> targets) =>
        targets.OrderBy(t => DefenderStrength(state, t))
            .ThenBy(t => WorldDistance.FlightSeconds(state.Config.Travel, fleet.To, t, 1.0))
            .ThenBy(t => t.Value, StringComparer.Ordinal).First();

    /// <summary>Strength of everything that would defend a planet: base ships of every player and parked team fleets.</summary>
    public static int DefenderStrength(GameState state, PlanetId planet)
    {
        var catalog = state.Config.Catalog;
        var baseShips = state.Players.Select(p => p.HoldingAt(planet)).Where(h => h is not null).Sum(h => Visibility.Strength(catalog, h!.Ships));
        var parked = state.Fleets.Where(f => f.Parked && f.To == planet && f.Side == Side.Team).Sum(f => Visibility.Strength(catalog, f));

        return baseShips + parked;
    }
}
