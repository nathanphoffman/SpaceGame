namespace SpaceGame.Core;

/// <summary>Applies SendFleet and RecallFleet.</summary>
public static class FleetOrders
{
    /// <summary>Takes the ships (and cargo) from the planet and launches a fleet.</summary>
    public static (GameState State, CommandResult Result) Send(GameState state, PlayerId playerId, SendFleet send, long nowSeconds)
    {
        var problem = FleetQuote.Problem(state, playerId, send) ?? CargoProblem(state, playerId, send, nowSeconds);

        if (problem is not null) return Fail(state, problem);
        var quote = FleetQuote.Make(state, playerId, send, nowSeconds);
        var player = state.PlayerById(playerId)!;
        var holding = player.HoldingAt(send.From)!;
        var ships = send.Ships.Where(s => s.Value > 0).ToDictionary(s => s.Key, s => s.Value);
        var cargo = send.Cargo ?? Resources.Zero;
        var stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player)).Spend(cargo);

        // Ships staying behind are what the holding has minus what is being sent.
        var left = holding.Ships.ToDictionary(s => s.Key, s => s.Value - ships.GetValueOrDefault(s.Key));
        var fleet = new Fleet(new FleetId($"f{state.NextFleetNumber}"), playerId, send.From, send.To,
            nowSeconds, quote.DepartAt, quote.ArriveAt, ships, cargo);
        var updated = player with { Stock = stock };

        return (state.WithPlayer(updated.WithHolding(holding with { Ships = left })) with
        {
            Fleets = [.. state.Fleets, fleet],
            NextFleetNumber = state.NextFleetNumber + 1,
        }, new CommandResult(true, null));
    }

    /// <summary>
    /// Turns a fleet around. During prep it simply goes home at once; in flight it flies back
    /// for as long as it has already flown.
    /// </summary>
    public static (GameState State, CommandResult Result) Recall(GameState state, PlayerId playerId, RecallFleet recall, long nowSeconds)
    {
        var fleet = state.Fleets.FirstOrDefault(f => f.Id == recall.Fleet && f.Owner == playerId);

        if (fleet is null) return Fail(state, "You have no such fleet.");

        if (fleet.Parked || fleet.ArriveAt <= nowSeconds) return Fail(state, "That fleet is not in flight.");

        if (fleet.Returning) return Fail(state, "That fleet is already returning.");
        var rest = state with { Fleets = [.. state.Fleets.Where(f => f.Id != fleet.Id)] };

        if (nowSeconds < fleet.DepartAt)

            return (FleetArrivals.Land(rest, fleet, fleet.From, nowSeconds, []), new CommandResult(true, null));

        var flown = nowSeconds - fleet.DepartAt;
        var back = fleet with
        {
            From = fleet.To,
            To = fleet.From,
            LaunchAt = nowSeconds,
            DepartAt = nowSeconds,
            ArriveAt = nowSeconds + flown,
            Returning = true,
        };

        return (rest with { Fleets = [.. rest.Fleets, back] }, new CommandResult(true, null));
    }

    // Returns why the cargo cannot be carried, or null when it is fine.
    private static string? CargoProblem(GameState state, PlayerId playerId, SendFleet send, long nowSeconds)
    {
        var cargo = send.Cargo;

        if (cargo is null || cargo.Total == 0) return null;

        if (cargo.HasNegative) return "Cargo cannot be negative.";
        var capacity = send.Ships.GetValueOrDefault(ShipType.Hauler) * state.Config.Catalog.Ship(ShipType.Hauler).Cargo;

        if (cargo.Total > capacity) return "Your Haulers cannot carry that much.";
        var player = state.PlayerById(playerId)!;
        var stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player));

        return stock.Amount.Covers(cargo) ? null : "You do not have that cargo in your stockpile.";
    }

    private static (GameState, CommandResult) Fail(GameState state, string error) => (state, new CommandResult(false, error));
}
