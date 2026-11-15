namespace SpaceGame.Core;

/// <summary>Runs the enemy's ticks inside Advance and applies its orders to the state.</summary>
internal static class EnemyTurns
{
    /// <summary>Takes every enemy tick due by <paramref name="nowSeconds"/>, resolving fleet arrivals up to each tick first.</summary>
    public static GameState Run(GameState state, long nowSeconds, List<GameEvent> events, IDice dice)
    {
        var result = state;
        var tick = result.Config.Enemy.TickSeconds;

        for (var due = result.EnemyLastTick + tick; due <= nowSeconds; due += tick)
        {
            result = FleetArrivals.Resolve(result, due, events, dice);
            result = Take(result, dice, due);
        }

        return result;
    }

    private static GameState Take(GameState state, IDice dice, long atSeconds)
    {
        var catalog = state.Config.Catalog;
        var spent = 0;
        var result = state;

        foreach (var order in EnemyBrain.Decide(state, dice, atSeconds))
        {
            result = Apply(result, order, atSeconds);
            spent += order.Cost(catalog);
        }

        return result with { EnemyBudget = state.EnemyBudget + EnemyBrain.Income(state) - spent, EnemyLastTick = atSeconds };
    }

    private static GameState Apply(GameState state, EnemyOrder order, long atSeconds) => order switch
    {
        BuyGarrison buy => AddToGarrison(state, state.EnemyHome!.Value, new Dictionary<ShipType, int> { [ShipType.Fighter] = buy.Fighters }),
        LaunchExpedition launch => Launch(state, launch, atSeconds),
        ClaimPlanet claim => Claim(state, claim),
        _ => state,
    };

    // Ships join the parked enemy fleet at the planet, or form one.
    private static GameState AddToGarrison(GameState state, PlanetId planet, IReadOnlyDictionary<ShipType, int> ships)
    {
        var existing = EnemyBrain.EnemyFleets(state).FirstOrDefault(f => f.Parked && f.To == planet);
        var merged = (existing?.Ships ?? new Dictionary<ShipType, int>()).ToDictionary(s => s.Key, s => s.Value);

        foreach (var (type, count) in ships) merged[type] = merged.GetValueOrDefault(type) + count;

        if (existing is not null) return Replace(state, existing, existing with { Ships = merged });
        var fleet = NewFleet(state, planet, planet, 0, 0, merged) with { Parked = true };

        return state with { Fleets = [.. state.Fleets, fleet], NextFleetNumber = state.NextFleetNumber + 1 };
    }

    private static GameState Replace(GameState state, Fleet old, Fleet updated) =>
        state with { Fleets = [.. state.Fleets.Select(f => f.Id == old.Id ? updated : f)] };

    private static Fleet NewFleet(GameState state, PlanetId from, PlanetId to, long departAt, long arriveAt, IReadOnlyDictionary<ShipType, int> ships) =>
        new(new FleetId($"f{state.NextFleetNumber}"), EnemyConfig.Owner, from, to, departAt, departAt, arriveAt, ships, Resources.Zero, Side: Side.Enemy);

    private static GameState Launch(GameState state, LaunchExpedition launch, long atSeconds)
    {
        var home = state.EnemyHome!.Value;
        var ships = new Dictionary<ShipType, int> { [ShipType.Colony] = 1, [ShipType.Fighter] = launch.Escorts };
        var speed = TravelRules.FleetSpeed(state.Config.Catalog, ships, 0);
        var departAt = atSeconds + state.Config.PrepSeconds;
        var arriveAt = departAt + WorldDistance.FlightSeconds(state.Config.Travel, home, launch.Target, speed);
        var fleet = NewFleet(state, home, launch.Target, departAt, arriveAt, ships) with { LaunchAt = atSeconds };

        return state with { Fleets = [.. state.Fleets, fleet], NextFleetNumber = state.NextFleetNumber + 1 };
    }

    // The Colony ship is used up; the rest of the fleet stays as the new planet's garrison.
    private static GameState Claim(GameState state, ClaimPlanet claim)
    {
        var fleet = state.Fleets.Single(f => f.Id == claim.Fleet);
        var rest = fleet.Ships.Where(s => s.Key != ShipType.Colony).ToDictionary(s => s.Key, s => s.Value);
        var fleets = state.Fleets.Where(f => f.Id != fleet.Id).Concat(rest.Count == 0 ? [] : [fleet with { Ships = rest }]);

        return state with { Fleets = [.. fleets], EnemyPlanets = [.. state.EnemyPlanets, fleet.To] };
    }
}
