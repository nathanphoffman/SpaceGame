namespace SpaceGame.Core;

/// <summary>What a planet keeps doing by itself: the next mine level or one more ship of a type, whenever it is idle and the player can pay.</summary>
public sealed record AutoOrder(BuildingType? Building, Element? Element, ShipType? Ship);

/// <summary>Turns an automatic order on or off for one planet.</summary>
public sealed record ToggleAuto(PlanetId Planet, AutoOrder Order) : GameCommand;

/// <summary>Auto mode: when a planet has nothing queued it starts the first automatic order it can afford.</summary>
public static class AutoQueue
{
    private const string BadOrder = "Only a mine or a ship can run on auto.";

    /// <summary>Flips the order on or off, and starts it right away when the planet is idle.</summary>
    public static (GameState State, CommandResult Result) Toggle(GameState state, PlayerId playerId, ToggleAuto cmd, long nowSeconds)
    {
        var holding = state.PlayerById(playerId)?.HoldingAt(cmd.Planet);

        if (holding is null) return (state, new CommandResult(false, "You have no base on that planet."));

        if (!Repeatable(cmd.Order)) return (state, new CommandResult(false, BadOrder));
        var on = holding.Auto.Contains(cmd.Order);
        var auto = on ? holding.Auto.Where(order => order != cmd.Order) : holding.Auto.Append(cmd.Order);
        var player = state.PlayerById(playerId)!.WithHolding(holding with { Auto = [.. auto] });
        var next = state.WithPlayer(player);

        return (on ? next : next.WithPlayer(Run(next, player, player.HoldingAt(cmd.Planet)!, nowSeconds)), new CommandResult(true, null));
    }

    /// <summary>Starts the first automatic order that works, if the planet is idle. Does nothing when the planet is busy or nothing is affordable.</summary>
    public static PlayerState Run(GameState state, PlayerState player, Holding holding, long at)
    {
        if (holding.Queue.Count > 0) return player;

        foreach (var order in holding.Auto)
        {
            var (next, result) = BuildQueues.Apply(state.WithPlayer(player), player.Id, holding.Planet, order, at);

            if (result.Ok) return next.PlayerById(player.Id)!;
        }

        return player;
    }

    private static bool Repeatable(AutoOrder order) =>
        (order.Building == BuildingType.Mine && order.Element is not null && order.Ship is null) ||
        (order.Building is null && order.Element is null && order.Ship is not null);
}
