namespace SpaceGame.Core;

/// <summary>Applies BuildBuilding and QueueShip: checks the rules, takes the cost up front, queues the item.</summary>
public static class BuildQueues
{
    /// <summary>Most ships one order may hold.</summary>
    public const int MaxShipsPerOrder = 100;

    private static readonly CommandResult Ok = new(true, null);

    private sealed record Context(PlayerState Player, Holding Holding);

    /// <summary>Queues a building (or the next level of a mine).</summary>
    public static (GameState State, CommandResult Result) Build(GameState state, PlayerId playerId, BuildBuilding cmd, long nowSeconds)
    {
        var (context, error) = Lookup(state, playerId, cmd.Planet, nowSeconds);

        if (context is null) return Fail(state, error);
        var spec = state.Config.Catalog.Building(cmd.Type);
        var level = cmd.Type == BuildingType.Mine && cmd.Element is { } e ? context.Holding.PendingMineLevel(e) + 1 : 1;
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
        var spec = state.Config.Catalog.Ship(cmd.Type);
        var problem = ShipProblem(context.Holding, cmd.Count) ?? CostProblem(context.Player, spec.Cost * cmd.Count);

        if (problem is not null) return Fail(state, problem);
        var start = context.Holding.QueueEnd(nowSeconds);
        var items = new List<QueueItem>();

        for (var index = 0; index < cmd.Count; index++)
        {
            var begin = start + index * spec.BuildSeconds;
            items.Add(new QueueItem($"q{context.Player.NextItemNumber + index}", null, null, cmd.Type, 1,
                begin, begin + spec.BuildSeconds, spec.Cost));
        }

        return (Enqueue(state, context, items), Ok);
    }

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

    private static string? BuildingProblem(GameState state, Holding holding, BuildBuilding cmd, BuildingSpec spec, int level)
    {
        if (cmd.Type != BuildingType.Mine)

            return holding.HasOrQueues(cmd.Type) ? $"This planet already has a {cmd.Type.ToString().ToLower()}." : null;

        if (cmd.Element is not { } element) return "Choose which element the mine digs.";

        if ((state.PlanetById(holding.Planet)?.RichnessOf(element) ?? 0) <= 0) return $"This planet has no {element} to mine.";

        return level > spec.MaxLevel ? $"The {element} mine is already at its top level." : null;
    }

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
