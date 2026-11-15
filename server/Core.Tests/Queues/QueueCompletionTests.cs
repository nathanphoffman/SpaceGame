using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class QueueCompletionTests
{
    [Fact]
    public void AdvanceCompletesDueItemsInTimeOrder()
    {
        var state = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 2)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null)).State;
        var (done, events) = GameEngineFactory.Create().Advance(state, 25 * Minute, new FixedDice());
        Assert.Equal([10 * Minute, 20 * Minute], events.Select(e => e.Time));
        Assert.All(events, e => Assert.Equal("ShipBuilt", e.Kind));
        Assert.Equal(2, At(done).Ships[ShipType.Fighter]);
        Assert.Single(At(done).Queue);
        Assert.False(At(done).HasDefense);
    }

    [Fact]
    public void CompletedMineStartsProducingFromItsFinishTime()
    {
        var state = Do(Game(new Resources(100, 0, 0, 0)), new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        var finish = 20 * Minute;
        var (done, events) = GameEngineFactory.Create().Advance(state, finish + 3600, new FixedDice());
        Assert.Equal("BuildingCompleted", events.Single().Kind);
        Assert.Equal(1, At(done).Mines[Element.Iron]);
        Assert.Equal(50 + 20, done.PlayerById(Me)!.Stock.Amount.Iron);
    }

    [Fact]
    public void BuildingFlagsAreSetWhenDone()
    {
        var state = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null)).State;
        var (done, _) = GameEngineFactory.Create().Advance(state, 10 * 3600, new FixedDice());
        Assert.True(At(done).HasShipyard);
        Assert.True(At(done).HasDefense);
    }
}
