namespace SpaceGame.Core;

/// <summary>Applies BuildBuilding and QueueShip: checks the rules, takes the cost up front, queues the item.</summary>
public static class BuildQueues
{
    /// <summary>Most ships one order may hold.</summary>
    public const int MaxShipsPerOrder = 100;

    private static readonly CommandResult Ok = new(true, null);
    private const string Busy = "This planet is busy. Wait for it to finish, or cancel what it is doing.";

    private sealed record Context(PlayerState Player, Holding Holding);

    /// <summary>Queues a building (or the next level of a mine).</summary>
    public static (GameState State, CommandResult Result) QueueBuilding(GameState state, PlayerId playerId, BuildBuilding cmd, long nowSeconds)
    {
        var (context, error) = Lookup(state, playerId, cmd.Planet, nowSeconds);

        if (context is null) return Fail(state, error);

        if (context.Holding.Queue.Count > 0) return Fail(state, Busy);
        var spec = state.Config.Catalog.Building(cmd.Type);
        var level = context.Holding.NextLevel(cmd.Type, cmd.Element);
        var cost = spec.CostAtLevel(level);
        var problem = BuildingProblem(state, context.Holding, cmd, spec, level) ?? CostProblem(context.Player, cost);

        if (problem is not null) return Fail(state, problem);
        var start = context.Holding.QueueEnd(nowSeconds);
        var element = cmd.Type == BuildingType.Mine ? cmd.Element : null;
        var item = new QueueItem($"q{context.Player.NextItemNumber}", cmd.Type, element, null, level,
            start, start + spec.SecondsAtLevel(level), cost);

        return (Enqueue(state, context, [item]), Ok);
    }

    /// <summary>Queues ships, one after another.</summary>
    public static (GameState State, CommandResult Result) QueueShips(GameState state, PlayerId playerId, QueueShip cmd, long nowSeconds)
    {
        var (context, error) = Lookup(state, playerId, cmd.Planet, nowSeconds);

        if (context is null) return Fail(state, error);

        if (context.Holding.Queue.Count > 0) return Fail(state, Busy);
        var spec = state.Config.Catalog.Ship(cmd.Type);
        var problem = ShipProblem(context.Holding, cmd.Count) ?? CostProblem(context.Player, spec.Cost * cmd.Count);

        if (problem is not null) return Fail(state, problem);
        var start = context.Holding.QueueEnd(nowSeconds);
        var items = new List<QueueItem>();
        var seconds = ShipSeconds(state.Config.Catalog, spec, context.Holding.ShipyardLevel);

        for (var index = 0; index < cmd.Count; index++)
        {
            var begin = start + index * seconds;
            items.Add(new QueueItem($"q{context.Player.NextItemNumber + index}", null, null, cmd.Type, 1,
                begin, begin + seconds, spec.Cost));
        }

        return (Enqueue(state, context, items), Ok);
    }

    /// <summary>Queues one automatic order (the next mine level, or one ship) as if the player had pressed the button.</summary>
    public static (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, PlanetId planet, AutoOrder order, long nowSeconds) =>
        order.Ship is { } ship
            ? QueueShips(state, player, new QueueShip(planet, ship, 1), nowSeconds)
            : QueueBuilding(state, player, new BuildBuilding(planet, order.Building!.Value, order.Element), nowSeconds);

    // Every shipyard level above the first builds ships a bit faster, with no limit.
    private static long ShipSeconds(Catalog catalog, ShipSpec spec, int shipyardLevel) =>
        (long)Math.Round(spec.BuildSeconds / (1 + catalog.ShipyardSpeedPerLevel * Math.Max(0, shipyardLevel - 1)));

    private static (GameState, CommandResult) Fail(GameState state, string? error) => (state, new CommandResult(false, error));

    private static (Context? Context, string? Error) Lookup(GameState state, PlayerId playerId, PlanetId planet, long nowSeconds)
    {
        var player = state.PlayerById(playerId);

        if (player is null) return (null, "You are not in this game.");
        var holding = player.HoldingAt(planet);

        if (holding is null) return (null, "You have no base on that planet.");
        var stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player));

        return (new Context(player with { Stock = stock }, holding), null);
    }

    // Returns why the building cannot be queued, or null when it can.
    private static string? BuildingProblem(GameState state, Holding holding, BuildBuilding cmd, BuildingSpec spec, int level)
    {
        if (cmd.Type != BuildingType.Mine) return null;

        if (cmd.Element is not { } element) return "Choose which element the mine digs.";

        if ((state.PlanetById(holding.Planet)?.RichnessOf(element) ?? 0) <= 0) return $"This planet has no {element} to mine.";

        return level > spec.MaxLevel ? $"The {element} mine is already at its top level." : null;
    }

    // Returns why the ships cannot be queued here, or null when they can.
    private static string? ShipProblem(Holding holding, int count)
    {
        if (count < 1 || count > MaxShipsPerOrder) return $"Order between 1 and {MaxShipsPerOrder} ships.";

        return holding.HasShipyard ? null : "Build a shipyard on this planet first.";
    }

    private static string? CostProblem(PlayerState player, Resources cost) =>
        player.Stock.Amount.Covers(cost) ? null : "Not enough resources.";

    private static GameState Enqueue(GameState state, Context context, IReadOnlyList<QueueItem> items)
    {
        var total = items.Aggregate(Resources.Zero, (sum, i) => sum + i.Cost);
        var holding = context.Holding with { Queue = [.. context.Holding.Queue, .. items] };
        var player = context.Player with
        {
            Stock = context.Player.Stock.Spend(total),
            NextItemNumber = context.Player.NextItemNumber + items.Count,
        };

        return state.WithPlayer(player.WithHolding(holding));
    }
}
