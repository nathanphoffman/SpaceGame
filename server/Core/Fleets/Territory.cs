namespace SpaceGame.Core;

/// <summary>Who holds a planet, from one player's point of view.</summary>
[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum Control { Mine, Ally, Hostile }

/// <summary>A planet someone holds and the viewer knows about.</summary>
public sealed record PlanetControl(PlanetId Planet, Control Control);

/// <summary>
/// Who holds which planet, as far as one player knows. Team bases are always known. An enemy planet is only known
/// while a teammate has a base or a ship in the same system.
/// </summary>
public static class Territory
{
    public static IReadOnlyList<PlanetControl> For(GameState state, PlayerId player, long nowSeconds)
    {
        var known = TeamSystems(state, nowSeconds);
        var team = state.Players.SelectMany(p => p.Holdings.Select(h => new PlanetControl(h.Planet, p.Id == player ? Control.Mine : Control.Ally)));
        var hostile = state.EnemyPlanets.Where(planet => WorldDistance.SystemOf(planet) is { } system && known.Contains(system))
            .Select(planet => new PlanetControl(planet, Control.Hostile));

        return [.. team, .. hostile];
    }

    // Systems where a teammate has a base or a ship right now.
    private static HashSet<SystemId> TeamSystems(GameState state, long nowSeconds)
    {
        var planets = state.Players.SelectMany(p => p.Holdings.Select(h => h.Planet))
            .Concat(state.Fleets.Where(f => f.Side == Side.Team).Select(f => Visibility.Position(f, nowSeconds)));

        return [.. planets.Select(WorldDistance.SystemOf).OfType<SystemId>()];
    }
}
