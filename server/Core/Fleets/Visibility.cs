namespace SpaceGame.Core;

/// <summary>Fog of war: what the team can see of the enemy, and the one-time FleetSpotted alerts.</summary>
public static class Visibility
{
    private const int ShipSightHops = 1;
    private const int ScoutSightHops = 2;
    private const double ChancesPerRoll = 6.0;

    /// <summary>Own fleets, plus every team fleet and any enemy fleet the team can see.</summary>
    public static IReadOnlyList<FleetView> FleetsFor(GameState state, PlayerId player, long nowSeconds)
    {
        if (state.PlayerById(player) is null) return [];

        var sight = TeamSight(state, nowSeconds);

        return [.. state.Fleets
            .Where(f => f.Side == Side.Team || SeenBy(sight, f))
            .Select(f => f.ToView())];
    }

    /// <summary>Adds a FleetSpotted event for each enemy fleet that has just become visible.</summary>
    public static GameState Announce(GameState state, long nowSeconds, List<GameEvent> events)
    {
        var sight = TeamSight(state, nowSeconds);
        var fresh = state.Fleets.Where(f => f.Side == Side.Enemy && !state.SpottedFleets.Contains(f.Id) && SeenBy(sight, f)).ToList();

        events.AddRange(fresh.Select(f => Spotted(state, f, nowSeconds)));

        return fresh.Count == 0 ? state : state with { SpottedFleets = [.. state.SpottedFleets, .. fresh.Select(f => f.Id)] };
    }

    private static GameEvent Spotted(GameState state, Fleet fleet, long nowSeconds) =>
        new(nowSeconds, "FleetSpotted", new Dictionary<string, string>
        {
            ["fleet"] = fleet.Id.Value,
            ["planet"] = fleet.To.Value,
            ["arrivesAt"] = fleet.ArriveAt.ToString(),
            ["strength"] = Strength(state.Config.Catalog, fleet).ToString(),
        });

    /// <summary>Expected damage per round times hit points, summed over the ships.</summary>
    public static int Strength(Catalog catalog, Fleet fleet) =>
        (int)Math.Round(fleet.Ships.Sum(ship => ship.Value * ShipPower(catalog.Ship(ship.Key))));

    private static double ShipPower(ShipSpec spec) =>
        spec.HitsOn == 0 ? 0 : spec.Shots * (ChancesPerRoll - spec.HitsOn + 1) / ChancesPerRoll * spec.Hp;

    private static bool SeenBy(HashSet<SystemId> sight, Fleet fleet) =>
        IsIn(sight, fleet.To) || IsIn(sight, fleet.From);

    private static bool IsIn(HashSet<SystemId> sight, PlanetId planet) =>
        WorldDistance.SystemOf(planet) is { } system && sight.Contains(system);

    private static void Watch(HashSet<SystemId> sight, PlanetId planet, int hops)
    {
        if (WorldDistance.SystemOf(planet) is { } system) sight.UnionWith(StarHops.Within(system, hops));
    }

    // Every system the team can currently see into.
    private static HashSet<SystemId> TeamSight(GameState state, long nowSeconds)
    {
        var sight = new HashSet<SystemId>();

        foreach (var (planet, hasScout) in state.Players.SelectMany(p => p.Holdings).Select(h => (h.Planet, h.Ships.GetValueOrDefault(ShipType.Scout) > 0)))
        {
            Watch(sight, planet, hasScout ? ScoutSightHops : ShipSightHops);
        }

        foreach (var fleet in state.Fleets.Where(f => f.Side == Side.Team))
        {
            var hops = fleet.Ships.GetValueOrDefault(ShipType.Scout) > 0 ? ScoutSightHops : ShipSightHops;
            Watch(sight, Position(fleet, nowSeconds), hops);
        }

        return sight;
    }

    // A fleet watches from where it left until it lands.
    private static PlanetId Position(Fleet fleet, long nowSeconds) =>
        fleet.Parked || nowSeconds >= fleet.ArriveAt ? fleet.To : fleet.From;
}
