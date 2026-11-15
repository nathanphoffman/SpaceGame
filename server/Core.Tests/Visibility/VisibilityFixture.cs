namespace SpaceGame.Core.Tests;

internal static class VisibilityFixture
{
    internal static readonly PlayerId EnemyId = new("enemy");
    internal static readonly SystemId SolId = StarCatalog.Sol.Id;

    internal static PlanetId PlanetInSystem(SystemId id) => StarCatalog.Systems.First(s => s.Id == id).Planets[0].Id;

    // A system with planets exactly this many hops from Sol; hops 3 means anywhere out of reach (beyond 2 hops).
    internal static SystemId SystemAtHops(int hops)
    {
        var within = StarHops.Within(SolId, Math.Min(hops, 2));
        var closer = StarHops.Within(SolId, hops - 1);

        return StarCatalog.Systems.First(s => s.Planets.Count > 0 && (hops >= 3 ? !within.Contains(s.Id) : within.Contains(s.Id) && !closer.Contains(s.Id))).Id;
    }

    internal static Fleet EnemyAt(PlanetId from, PlanetId to, string id = "e1") =>
        new(new FleetId(id), EnemyId, from, to, 0, 0, 5000,
            new Dictionary<ShipType, int> { [ShipType.Fighter] = 3 }, Resources.Zero, Side: Side.Enemy);

    internal static GameState GameWithFleet(Fleet fleet) => FleetFixture.FleetGame() with { Fleets = [fleet] };

    // The starting kit has a Scout at Earth; take it away to test plain one-hop sight.
    internal static GameState WithoutScout(GameState state) => WithEarthShips(state, new Dictionary<ShipType, int> { [ShipType.Fighter] = 1 });

    internal static GameState WithEarthShips(GameState state, Dictionary<ShipType, int> ships)
    {
        var player = state.PlayerById(FleetFixture.Me)!;

        return state.WithPlayer(player.WithHolding(player.HoldingAt(StartingKit.EarthId)! with { Ships = ships }));
    }

    internal static bool Sees(GameState state) =>
        FleetFixture.Engine.ViewFor(state, FleetFixture.Me, 10).Fleets.Any(f => f.Side == Side.Enemy);
}
