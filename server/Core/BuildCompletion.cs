namespace SpaceGame.Core;

/// <summary>Income rate of a player, from the mines they own.</summary>
public static class Economy
{
    /// <summary>Milli-units per hour per element over all of the player's mines.</summary>
    public static Resources RatePerHourMilli(GameState state, PlayerState player)
    {
        var rate = Resources.Zero;

        foreach (var holding in player.Holdings)
        {
            var planet = state.PlanetById(holding.Planet);

            foreach (var (element, level) in holding.Mines)
            {
                var milli = MineOutput.MilliPerHour(state.Config.Catalog, level, planet?.RichnessOf(element) ?? 0,
                    player.UpgradeLevel(UpgradeType.Mining));
                rate += MineOutput.RateFor(element, milli);
            }
        }

        return rate;
    }
}

/// <summary>Finishes queue items whose time has come, in time order.</summary>
public static class BuildCompletion
{
    /// <summary>Completes everything due by <paramref name="nowSeconds"/> and brings every stockpile up to date.</summary>
    public static (GameState State, IReadOnlyList<GameEvent> Events) Complete(GameState state, long nowSeconds)
    {
        var events = new List<GameEvent>();
        var result = state;

        foreach (var player in state.Players)
            result = result.WithPlayer(CompletePlayer(result, player, nowSeconds, events));

        events.Sort((a, b) => a.Time.CompareTo(b.Time));

        return (result with { Time = Math.Max(result.Time, nowSeconds) }, events);
    }

    private static PlayerState CompletePlayer(GameState state, PlayerState start, long nowSeconds, List<GameEvent> events)
    {
        var player = start;

        while (true)
        {
            var research = player.Research;
            var due = NextDue(player, nowSeconds);

            if (research is { } job && job.FinishAt <= nowSeconds && (due is null || job.FinishAt <= due.Value.Item.FinishAt))
            {
                player = Upgrades.Finish(player, state, job, events);

                continue;
            }

            if (due is null) break;

            var stock = player.Stock.AdvanceTo(due.Value.Item.FinishAt, Economy.RatePerHourMilli(state, player));
            player = Finish(player with { Stock = stock }, due.Value.Holding, due.Value.Item);
            events.Add(EventFor(player.Id, due.Value.Holding.Planet, due.Value.Item));
        }

        return player with { Stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player)) };
    }

    private static (Holding Holding, QueueItem Item)? NextDue(PlayerState player, long nowSeconds) =>
        player.Holdings
            .SelectMany(h => h.Queue.Select(i => (Holding: h, Item: i)))
            .Where(x => x.Item.FinishAt <= nowSeconds)
            .OrderBy(x => x.Item.FinishAt).ThenBy(x => x.Item.Id, StringComparer.Ordinal)
            .Select(x => ((Holding, QueueItem)?)x)
            .FirstOrDefault();

    private static PlayerState Finish(PlayerState player, Holding holding, QueueItem item)
    {
        var rest = holding with { Queue = [.. holding.Queue.Where(i => i.Id != item.Id)] };

        return player.WithHolding(Apply(rest, item));
    }

    private static Holding Apply(Holding holding, QueueItem item) => item.Building switch
    {
        BuildingType.Mine => holding with { Mines = With(holding.Mines, item.Element!.Value, item.Level) },
        BuildingType.Shipyard => holding with { HasShipyard = true },
        BuildingType.Defense => holding with { HasDefense = true },
        _ => holding with { Ships = With(holding.Ships, item.Ship!.Value, holding.Ships.GetValueOrDefault(item.Ship.Value) + 1) },
    };

    private static Dictionary<TKey, int> With<TKey>(IReadOnlyDictionary<TKey, int> map, TKey key, int value)
        where TKey : notnull
    {
        var copy = map.ToDictionary(pair => pair.Key, pair => pair.Value);
        copy[key] = value;

        return copy;
    }

    private static GameEvent EventFor(PlayerId player, PlanetId planet, QueueItem item) => new(
        item.FinishAt, item.Ship is null ? "BuildingCompleted" : "ShipBuilt",
        new Dictionary<string, string>
        {
            ["player"] = player.Value,
            ["planet"] = planet.Value,
            ["what"] = (item.Ship?.ToString() ?? item.Building.ToString())!,
            ["level"] = item.Level.ToString(),
        });
}
