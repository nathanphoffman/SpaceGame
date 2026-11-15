namespace SpaceGame.Core;

/// <summary>Decides what the enemy does at each tick. Pure: it reads the state and returns orders.</summary>
public static class EnemyBrain
{
    /// <summary>Points the enemy earns each tick.</summary>
    public static int Income(GameState state) => state.EnemyPlanets.Count * state.Config.Enemy.IncomePerPlanetPerTick;

    /// <summary>The orders for this tick, in the order they are applied. Attack choices (part 2) will use the dice.</summary>
    public static IReadOnlyList<EnemyOrder> Decide(GameState state, IDice dice, long nowSeconds)
    {
        var catalog = state.Config.Catalog;
        var budget = state.EnemyBudget + Income(state);
        var orders = new List<EnemyOrder>();

        if (EarthAttackSchedule.Due(state, nowSeconds) is { } earthAttack) orders.Add(earthAttack);

        orders.AddRange(EnemyFleets(state).Where(f => CanClaim(state, f)).Select(f => new ClaimPlanet(f.Id)));

        if (RefillGarrison(state, budget) is { } refill)
        {
            orders.Add(refill);
            budget -= refill.Cost(catalog);
        }

        if (ExpeditionOrder(state, budget) is { } expedition) orders.Add(expedition);

        if (EnemyAttack.Choose(state) is { } attack) orders.Add(attack);

        return orders;
    }

    internal static IEnumerable<Fleet> EnemyFleets(GameState state) => state.Fleets.Where(f => f.Side == Side.Enemy);

    /// <summary>Fighters the enemy has parked at its home world.</summary>
    public static int HomeFighters(GameState state) =>
        EnemyFleets(state).Where(f => f.Parked && f.To == state.EnemyHome).Sum(f => f.Ships.GetValueOrDefault(ShipType.Fighter));

    // A parked Colony ship can claim a planet that no player and not the enemy holds.
    private static bool CanClaim(GameState state, Fleet fleet) =>
        fleet.Parked && fleet.Ships.GetValueOrDefault(ShipType.Colony) > 0
        && !state.EnemyPlanets.Contains(fleet.To)
        && state.Players.All(p => p.HoldingAt(fleet.To) is null);

    private static BuyGarrison? RefillGarrison(GameState state, int budget)
    {
        var missing = state.Config.Enemy.HomeGarrisonFighters - HomeFighters(state);
        var affordable = budget / state.Config.Catalog.Ship(ShipType.Fighter).Cost.Total;
        var count = Math.Min(missing, affordable);

        return count > 0 ? new BuyGarrison(count) : null;
    }

    // One expedition at a time: only when no enemy Colony ship is on its way or waiting to claim.
    private static LaunchExpedition? ExpeditionOrder(GameState state, int budget)
    {
        if (EnemyFleets(state).Any(f => f.Ships.GetValueOrDefault(ShipType.Colony) > 0)) return null;
        var order = new LaunchExpedition(default, state.Config.Enemy.EscortFighters);

        if (order.Cost(state.Config.Catalog) > budget) return null;

        return ExpeditionTarget(state) is { } target ? order with { Target = target } : null;
    }

    /// <summary>The first planet of the unclaimed system nearest to Earth; null when every system is taken.</summary>
    public static PlanetId? ExpeditionTarget(GameState state)
    {
        var earth = StarCatalog.Systems.Single(s => s.Id == WorldDistance.SystemOf(StartingKit.EarthId));
        var taken = TakenSystems(state);

        return StarCatalog.Systems.Where(s => !taken.Contains(s.Id) && s.Planets.Count > 0)
            .OrderBy(s => GalaxyGenerator.Distance(earth, s)).ThenBy(s => s.Id.Value, StringComparer.Ordinal)
            .Select(s => (PlanetId?)s.Planets[0].Id).FirstOrDefault();
    }

    // Systems that hold a player base or an enemy planet, or that an enemy fleet is heading to; Earth's system is always taken.
    private static HashSet<SystemId?> TakenSystems(GameState state)
    {
        var planets = state.EnemyPlanets
            .Concat(state.Players.SelectMany(p => p.Holdings.Select(h => h.Planet)))
            .Concat(EnemyFleets(state).Select(f => f.To))
            .Append(StartingKit.EarthId);

        return [.. planets.Select(WorldDistance.SystemOf)];
    }
}
