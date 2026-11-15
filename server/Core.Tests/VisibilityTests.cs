namespace SpaceGame.Core.Tests;

public class VisibilityTests
{
    private static readonly PlayerId EnemyId = new("enemy");
    private static readonly SystemId SolId = StarCatalog.Sol.Id;

    private static PlanetId PlanetInSystem(SystemId id) => StarCatalog.Systems.First(s => s.Id == id).Planets[0].Id;

    // A system with planets exactly this many hops from Sol; hops 3 means anywhere out of reach (beyond 2 hops).
    private static SystemId SystemAtHops(int hops)
    {
        var within = StarHops.Within(SolId, Math.Min(hops, 2));
        var closer = StarHops.Within(SolId, hops - 1);

        return StarCatalog.Systems.First(s => s.Planets.Count > 0 && (hops >= 3 ? !within.Contains(s.Id) : within.Contains(s.Id) && !closer.Contains(s.Id))).Id;
    }

    private static Fleet EnemyAt(PlanetId from, PlanetId to, string id = "e1") =>
        new(new FleetId(id), EnemyId, from, to, 0, 0, 5000,
            new Dictionary<ShipType, int> { [ShipType.Fighter] = 3 }, Resources.Zero, Side: Side.Enemy);

    private static GameState With(Fleet fleet) => FleetFixture.FleetGame() with { Fleets = [fleet] };

    // The starting kit has a Scout at Earth; take it away to test plain one-hop sight.
    private static GameState WithoutScout(GameState state) => WithEarthShips(state, new Dictionary<ShipType, int> { [ShipType.Fighter] = 1 });

    private static GameState WithEarthShips(GameState state, Dictionary<ShipType, int> ships)
    {
        var player = state.PlayerById(FleetFixture.Me)!;

        return state.WithPlayer(player.WithHolding(player.HoldingAt(StartingKit.EarthId)! with { Ships = ships }));
    }

    private static bool Sees(GameState state) =>
        FleetFixture.Engine.ViewFor(state, FleetFixture.Me, 10).Fleets.Any(f => f.Side == Side.Enemy);

    [Fact]
    public void EnemyAimedAtAHomeNeighbourIsSeen()
    {
        var near = PlanetInSystem(SystemAtHops(1));
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.True(Sees(With(EnemyAt(far, near))));
    }

    [Fact]
    public void EnemyTwoHopsAwayIsHiddenWithoutAScout()
    {
        var two = PlanetInSystem(SystemAtHops(2));
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.False(Sees(WithoutScout(With(EnemyAt(far, two)))));
    }

    [Fact]
    public void ScoutAtHomeSeesTwoHops()
    {
        var two = PlanetInSystem(SystemAtHops(2));
        var far = PlanetInSystem(SystemAtHops(3));
        var state = With(EnemyAt(far, two));
        var scouted = WithEarthShips(state, new Dictionary<ShipType, int> { [ShipType.Scout] = 1 });

        Assert.True(Sees(scouted));
    }

    [Fact]
    public void EnemyFarAwayIsHidden()
    {
        var far = PlanetInSystem(SystemAtHops(3));

        Assert.False(Sees(WithoutScout(With(EnemyAt(far, far)))));
    }

    [Fact]
    public void SpottedIsAnnouncedOnceWithItsPayload()
    {
        var state = With(EnemyAt(PlanetInSystem(SystemAtHops(3)), PlanetInSystem(SystemAtHops(1))));
        var (next, events) = FleetFixture.Engine.Advance(state, 10, new SeqDice());
        var (_, again) = FleetFixture.Engine.Advance(next, 20, new SeqDice());
        var spotted = events.Single(e => e.Kind == "FleetSpotted");

        Assert.Equal("e1", spotted.Data["fleet"]);
        Assert.Equal("5000", spotted.Data["arrivesAt"]);
        Assert.Equal("1", spotted.Data["strength"]);
        Assert.DoesNotContain(again, e => e.Kind == "FleetSpotted");
    }

    [Fact]
    public void ThreeNeighboursPerSystem()
    {
        Assert.Equal(1 + StarHops.NeighbourCount, StarHops.Within(SolId, 1).Count);
        Assert.True(StarHops.Within(SolId, 2).Count > StarHops.Within(SolId, 1).Count);
    }
}
