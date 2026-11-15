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
            result = RunTurn(result, dice, due, events);
        }

        return result;
    }

    private static GameState RunTurn(GameState state, IDice dice, long atSeconds, List<GameEvent> events)
    {
        var catalog = state.Config.Catalog;
        var spent = 0;
        var result = state;

        foreach (var order in EnemyBrain.Decide(state, dice, atSeconds))
        {
            result = Apply(result, order, atSeconds);
            events.Add(OrderEvent(order, atSeconds));
            spent += order.Cost(catalog);
        }

        return result with { EnemyBudget = state.EnemyBudget + EnemyBrain.Income(state) - spent, EnemyLastTick = atSeconds };
    }

    private static GameEvent OrderEvent(EnemyOrder order, long atSeconds) =>
        new(atSeconds, "EnemyOrder", new Dictionary<string, string> { ["order"] = order.GetType().Name, ["reason"] = order.Reason });

    private static GameState Apply(GameState state, EnemyOrder order, long atSeconds) => order switch
    {
        BuyGarrison buy => AddToGarrison(state, state.EnemyHome!.Value, new Dictionary<ShipType, int> { [ShipType.Fighter] = buy.Fighters }),
        LaunchExpedition launch => Launch(state, launch, atSeconds),
        ClaimPlanet claim => Claim(state, claim, atSeconds),
        LaunchEarthAttack earth => LaunchAtEarth(state, earth, atSeconds),
        LaunchAttack attack => Attack(state, attack, atSeconds),
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

    private static GameState LaunchAtEarth(GameState state, LaunchEarthAttack earth, long atSeconds)
    {
        var home = state.EnemyHome!.Value;
        var ships = new Dictionary<ShipType, int> { [ShipType.Fighter] = earth.Fighters };
        var speed = TravelRules.FleetSpeed(state.Config.Catalog, ships, 0);
        var departAt = atSeconds + state.Config.PrepSeconds;
        var arriveAt = departAt + WorldDistance.FlightSeconds(state.Config.Travel, home, StartingKit.EarthId, speed);
        var fleet = NewFleet(state, home, StartingKit.EarthId, departAt, arriveAt, ships) with { LaunchAt = atSeconds };

        return state with
        {
            Fleets = [.. state.Fleets, fleet],
            NextFleetNumber = state.NextFleetNumber + 1,
            EarthAttacksSent = state.EarthAttacksSent + 1,
        };
    }

    // The whole parked fleet sets off; it fights on arrival like any enemy fleet.
    private static GameState Attack(GameState state, LaunchAttack attack, long atSeconds)
    {
        var fleet = state.Fleets.Single(f => f.Id == attack.Fleet);
        var speed = TravelRules.FleetSpeed(state.Config.Catalog, fleet.Ships, 0);
        var departAt = atSeconds + state.Config.PrepSeconds;
        var arriveAt = departAt + WorldDistance.FlightSeconds(state.Config.Travel, fleet.To, attack.Target, speed);

        return Replace(state, fleet, fleet with
        {
            From = fleet.To,
            To = attack.Target,
            LaunchAt = atSeconds,
            DepartAt = departAt,
            ArriveAt = arriveAt,
            Parked = false,
        });
    }

    // The Colony ship is used up; the rest of the fleet stays as the new planet's garrison.
    private static GameState Claim(GameState state, ClaimPlanet claim, long atSeconds)
    {
        var fleet = state.Fleets.Single(f => f.Id == claim.Fleet);
        var rest = fleet.Ships.Where(s => s.Key != ShipType.Colony).ToDictionary(s => s.Key, s => s.Value);
        var fleets = state.Fleets.Where(f => f.Id != fleet.Id).Concat(rest.Count == 0 ? [] : [fleet with { Ships = rest }]);

        var claimed = state with { Fleets = [.. fleets], EnemyPlanets = [.. state.EnemyPlanets, fleet.To] };

        return Scoring.Capture(claimed, Side.Enemy, fleet.To, atSeconds);
    }
}
