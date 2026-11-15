namespace SpaceGame.Core;

/// <summary>Resolves fleets that reach their destination, in time order.</summary>
public static class FleetArrivals
{
    /// <summary>Lands every fleet whose arrival is due by <paramref name="nowSeconds"/>.</summary>
    public static GameState Resolve(GameState state, long nowSeconds, List<GameEvent> events)
    {
        var result = state;

        while (result.Fleets.Where(f => !f.Parked && f.ArriveAt <= nowSeconds)
                   .OrderBy(f => f.ArriveAt).ThenBy(f => f.Id.Value, StringComparer.Ordinal)
                   .FirstOrDefault() is { } due)
        {
            var others = result with { Fleets = [.. result.Fleets.Where(f => f.Id != due.Id)] };
            result = Land(others, due, due.To, due.ArriveAt, events);
        }

        return result;
    }

    /// <summary>
    /// Puts a fleet down at its destination. With a base there, ships join it and cargo goes into the stockpile;
    /// otherwise the fleet stays parked there.
    /// </summary>
    internal static GameState Land(GameState state, Fleet fleet, PlanetId planet, long atSeconds, List<GameEvent> events)
    {
        var player = state.PlayerById(fleet.Owner);
        var holding = player?.HoldingAt(planet);

        events.Add(new GameEvent(atSeconds, "FleetArrived", new Dictionary<string, string>
        {
            ["player"] = fleet.Owner.Value,
            ["fleet"] = fleet.Id.Value,
            ["planet"] = planet.Value,
        }));

        if (player is null || holding is null)
            return state with { Fleets = [.. state.Fleets, fleet with { To = planet, Parked = true }] };

        var stock = player.Stock.AdvanceTo(atSeconds, Economy.RatePerHourMilli(state, player)).Add(fleet.Cargo);
        var ships = holding.Ships.ToDictionary(s => s.Key, s => s.Value);

        foreach (var (type, count) in fleet.Ships) ships[type] = ships.GetValueOrDefault(type) + count;

        return state.WithPlayer((player with { Stock = stock }).WithHolding(holding with { Ships = ships }));
    }
}
