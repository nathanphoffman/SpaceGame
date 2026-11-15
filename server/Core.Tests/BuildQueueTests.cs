namespace SpaceGame.Core.Tests;

public class BuildQueueTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly PlanetId Earth = new("earth");
    private static readonly PlanetId Moon = new("moon");
    private const int Minute = 60;

    private static GameState Game(Resources? stock = null, Holding? holding = null)
    {
        var rich = new Dictionary<Element, int> { [Element.Iron] = 100, [Element.Hydrogen] = 50, [Element.Titanium] = 80 };
        var player = new PlayerState(Me, Stockpile.Start(stock ?? new Resources(1000, 1000, 1000, 1000), 0),
            [holding ?? new Holding(Earth)]);

        return new GameState(new GameConfig(), 0)
        {
            Planets = [new PlanetData(Earth, rich), new PlanetData(Moon, new Dictionary<Element, int>())],
            Players = [player],
        };
    }

    private static Holding WithYard() => new(Earth) { HasShipyard = true };

    private static (GameState State, CommandResult Result) Do(GameState state, GameCommand c, long nowSeconds = 0) =>
        GameEngineFactory.Create().Apply(state, Me, c, nowSeconds);

    private static string? Error(GameState state, GameCommand c, long nowSeconds = 0) => Do(state, c, nowSeconds).Result.Error;

    private static Holding At(GameState state) => state.PlayerById(Me)!.HoldingAt(Earth)!;

    [Fact]
    public void UnknownPlayerIsRejected() =>
        Assert.Equal("You are not in this game.",
            GameEngineFactory.Create().Apply(Game(), new PlayerId("x"), new BuildBuilding(Earth, BuildingType.Shipyard, null), 0).Result.Error);

    [Fact]
    public void PlanetWithoutBaseIsRejected() =>
        Assert.Equal("You have no base on that planet.", Error(Game(), new BuildBuilding(Moon, BuildingType.Shipyard, null)));

    [Fact]
    public void MineNeedsAnElement() =>
        Assert.Equal("Choose which element the mine digs.", Error(Game(), new BuildBuilding(Earth, BuildingType.Mine, null)));

    [Fact]
    public void MineNeedsRichnessOnThePlanet() =>
        Assert.Equal("This planet has no Helium3 to mine.", Error(Game(), new BuildBuilding(Earth, BuildingType.Mine, Element.Helium3)));

    [Fact]
    public void ShipyardCanOnlyBeBuiltOnce()
    {
        var (state, r) = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null));
        Assert.True(r.Ok);
        Assert.Equal("This planet already has a shipyard.", Error(state, new BuildBuilding(Earth, BuildingType.Shipyard, null)));
    }

    [Fact]
    public void FinishedDefenseCannotBeBuiltAgain() =>
        Assert.Equal("This planet already has a defense.",
            Error(Game(holding: new Holding(Earth) { HasDefense = true }), new BuildBuilding(Earth, BuildingType.Defense, null)));

    [Fact]
    public void MineStopsAtLevelThree()
    {
        var state = Game();

        for (var i = 0; i < 3; i++) state = Do(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        Assert.Equal("The Iron mine is already at its top level.", Error(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)));
        Assert.Equal(3, At(state).Queue.Count);
    }

    [Fact]
    public void NotEnoughResourcesIsRejectedAndNothingIsTaken()
    {
        var state = Game(new Resources(10, 0, 0, 0));
        var (after, result) = Do(state, new BuildBuilding(Earth, BuildingType.Shipyard, null));
        Assert.Equal("Not enough resources.", result.Error);
        Assert.Equal(state, after);
    }

    [Fact]
    public void BuildingTakesCostUpFrontAndQueuesWithItsTime()
    {
        var (state, r) = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null), 100);
        Assert.True(r.Ok);
        Assert.Equal(900, state.PlayerById(Me)!.Stock.Amount.Iron);
        var item = At(state).Queue.Single();
        Assert.Equal(100 + 30 * Minute, item.FinishAt);
    }

    [Fact]
    public void LaterMineLevelsCostAndTakeMore()
    {
        var state = Do(Game(), new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Mine, Element.Iron)).State;
        var second = At(state).Queue[1];
        Assert.Equal(80, second.Cost.Iron);
        Assert.Equal(20 * Minute + 30 * Minute, second.FinishAt);
        Assert.Equal(2, second.Level);
    }

    [Fact]
    public void ShipsNeedAShipyard() =>
        Assert.Equal("Build a shipyard on this planet first.", Error(Game(), new QueueShip(Earth, ShipType.Fighter, 1)));

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void ShipCountMustBeInRange(int count) =>
        Assert.Equal("Order between 1 and 100 ships.", Error(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, count)));

    [Fact]
    public void ShipOrderCostsEverythingUpFront()
    {
        var (state, r) = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 3));
        Assert.True(r.Ok);
        Assert.Equal(940, state.PlayerById(Me)!.Stock.Amount.Iron);
        Assert.Equal([10 * Minute, 20 * Minute, 30 * Minute], At(state).Queue.Select(i => i.FinishAt));
        Assert.Equal(3, At(state).Queue.Select(i => i.Id).Distinct().Count());
        Assert.Equal("Not enough resources.", Error(Game(new Resources(50, 0, 0, 0), WithYard()), new QueueShip(Earth, ShipType.Fighter, 3)));
    }

    [Fact]
    public void ItemsRunOneAfterAnother()
    {
        var state = Do(Game(holding: WithYard()), new QueueShip(Earth, ShipType.Fighter, 1)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null)).State;
        Assert.Equal(10 * Minute + 60 * Minute, At(state).Queue[1].FinishAt);
    }

    [Fact]
    public void AdvanceCompletesItemsInTimeOrderAndLeavesLaterOnes()
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
    public void ShipyardAndDefenseFlagsAreSetWhenDone()
    {
        var state = Do(Game(), new BuildBuilding(Earth, BuildingType.Shipyard, null)).State;
        state = Do(state, new BuildBuilding(Earth, BuildingType.Defense, null)).State;
        var (done, _) = GameEngineFactory.Create().Advance(state, 10 * 3600, new FixedDice());
        Assert.True(At(done).HasShipyard);
        Assert.True(At(done).HasDefense);
    }

    private sealed class FixedDice : IDice
    {
        public int Roll() => 3;
    }
}
