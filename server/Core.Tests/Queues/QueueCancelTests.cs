using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class QueueCancelTests
{
    private static GameState ThreeShips() => Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 3)).State;

    [Fact]
    public void CancelRefundsTheFullCost()
    {
        var state = ThreeShips();
        var (after, r) = Do(state, new CancelQueueItem(Earth, "q2"));
        Assert.True(r.Ok);
        Assert.Equal(960, after.PlayerById(Me)!.Stock.Amount.Iron);
        Assert.DoesNotContain(At(after).Queue, i => i.Id == "q2");
    }

    [Fact]
    public void LaterItemsShiftEarlier()
    {
        var (after, _) = Do(ThreeShips(), new CancelQueueItem(Earth, "q1"));
        Assert.Equal([0, 10 * Minute], At(after).Queue.Select(i => i.StartAt));
        Assert.Equal([10 * Minute, 20 * Minute], At(after).Queue.Select(i => i.FinishAt));
    }

    [Fact]
    public void CancellingStartedItemShiftsFromNow()
    {
        var (after, _) = Do(ThreeShips(), new CancelQueueItem(Earth, "q1"), 4 * Minute);
        Assert.Equal(4 * Minute, At(after).Queue[0].StartAt);
    }

    [Fact]
    public void UnknownItemFails()
    {
        Assert.Equal("That item is not in the queue.", Error(ThreeShips(), new CancelQueueItem(Earth, "nope")));
        Assert.Equal("You have no base on that planet.", Error(ThreeShips(), new CancelQueueItem(Moon, "q1")));
    }

    [Fact]
    public void MineLevelsCancelNewestFirst()
    {
        var cost = new Resources(50, 0, 0, 0);
        var state = Game(holding: new Holding(Earth)
        {
            Queue = [new QueueItem("q1", BuildingType.Mine, Element.Iron, null, 1, 0, 20 * Minute, cost), new QueueItem("q2", BuildingType.Mine, Element.Iron, null, 2, 20 * Minute, 50 * Minute, cost)],
        });
        Assert.Equal("Cancel the later levels of this mine first.", Error(state, new CancelQueueItem(Earth, "q1")));
        Assert.True(Do(state, new CancelQueueItem(Earth, "q2")).Result.Ok);
    }
}
