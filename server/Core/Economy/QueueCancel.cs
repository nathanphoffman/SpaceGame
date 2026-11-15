namespace SpaceGame.Core;

/// <summary>Applies CancelQueueItem: refunds the full cost and moves later items earlier.</summary>
public static class QueueCancel
{
    /// <summary>Removes one queued item, gives its cost back and closes the gap in the queue.</summary>
    public static (GameState State, CommandResult Result) Cancel(GameState state, PlayerId playerId, CancelQueueItem cmd, long nowSeconds)
    {
        var player = state.PlayerById(playerId);
        var holding = player?.HoldingAt(cmd.Planet);

        if (player is null || holding is null) return Fail(state, "You have no base on that planet.");
        var index = holding.Queue.ToList().FindIndex(i => i.Id == cmd.ItemId);

        if (index < 0) return Fail(state, "That item is not in the queue.");
        var item = holding.Queue[index];

        if (item.Building == BuildingType.Mine && holding.Queue.Skip(index + 1).Any(i => i.Element == item.Element))

            return Fail(state, "Cancel the later levels of this mine first.");

        var stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player)).Add(item.Cost);
        var queue = Close(holding.Queue, index, nowSeconds);

        return (state.WithPlayer((player with { Stock = stock }).WithHolding(holding with { Queue = queue })),
            new CommandResult(true, null));
    }

    private static List<QueueItem> Close(IReadOnlyList<QueueItem> queue, int removed, long nowSeconds)
    {
        var result = queue.Take(removed).ToList();
        var cursor = Math.Max(queue[removed].StartAt, nowSeconds);

        foreach (var later in queue.Skip(removed + 1))
        {
            var length = later.FinishAt - later.StartAt;
            result.Add(later with { StartAt = cursor, FinishAt = cursor + length });
            cursor += length;
        }

        return result;
    }

    private static (GameState, CommandResult) Fail(GameState state, string error) => (state, new CommandResult(false, error));
}
