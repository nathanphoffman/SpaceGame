using static SpaceGame.Core.Tests.QueueFixture;

namespace SpaceGame.Core.Tests;

public class AutoQueueTests
{
    private static readonly AutoOrder Fighters = new(null, null, ShipType.Fighter);
    private static readonly AutoOrder IronMine = new(BuildingType.Mine, Element.Iron, null);
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    [Fact]
    public void TogglingAutoStartsTheShipAtOnceAndTogglingAgainTurnsItOff()
    {
        var on = Do(Game(holding: WithYard()), new ToggleAuto(Earth, Fighters)).State;

        Assert.Equal([Fighters], At(on).Auto);
        Assert.Single(At(on).Queue);
        Assert.Empty(At(Do(on, new ToggleAuto(Earth, Fighters)).State).Auto);
    }

    [Fact]
    public void AutoKeepsBuildingShipsOneAfterAnotherWhileTheMoneyLasts()
    {
        var state = Do(Game(new Resources(60, 0, 0, 0), WithYard()), new ToggleAuto(Earth, Fighters)).State;
        var (done, events) = Engine.Advance(state, 100 * Minute, new FixedDice());

        Assert.Equal(3, At(done).Ships[ShipType.Fighter]);
        Assert.Equal(3, events.Count(e => e.Kind == "ShipBuilt"));
        Assert.Empty(At(done).Queue);
    }

    [Fact]
    public void AutoWaitsForMoneyAndThenStarts()
    {
        var poor = Game(new Resources(0, 0, 0, 0), new Holding(Earth) { HasShipyard = true, Auto = [Fighters] });
        var (still, _) = Engine.Advance(poor, 10 * Minute, new FixedDice());
        Assert.Empty(At(still).Queue);

        var funded = still.WithPlayer(still.PlayerById(Me)! with { Stock = Stockpile.Open(new Resources(20, 0, 0, 0), 10 * Minute) });
        var (started, _) = Engine.Advance(funded, 11 * Minute, new FixedDice());
        Assert.Single(At(started).Queue);
    }

    [Fact]
    public void AutoMineRaisesTheMineUntilItsTopLevel()
    {
        var state = Do(Game(), new ToggleAuto(Earth, IronMine)).State;
        var (done, _) = Engine.Advance(state, 10 * 3600, new FixedDice());

        Assert.Equal(3, At(done).Mines[Element.Iron]);
        Assert.Empty(At(done).Queue);
    }

    [Fact]
    public void OnlyMinesAndShipsCanRunOnAuto() =>
        Assert.Equal("Only a mine or a ship can run on auto.", Error(Game(), new ToggleAuto(Earth, new AutoOrder(BuildingType.Defense, null, null))));
}
