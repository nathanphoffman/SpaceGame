using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class GameEngineTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly PlanetId Mars = StarCatalog.Systems[0].Planets.Single(p => p.Name == "Mars").Id;
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    private static GameState New() =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(Me, "Ann"), new PlayerSetup(new PlayerId("p2"), "Bo")], new GameConfig()));

    [Fact]
    public void NewGameGivesStartingKit()
    {
        var player = New().PlayerById(Me)!;
        var holding = player.HoldingAt(StartingKit.EarthId)!;
        Assert.Equal(new Resources(300, 100, 50, 0), player.Stock.Amount);
        Assert.Equal(4, holding.Ships[ShipType.Fighter]);
        Assert.Equal(1, holding.Ships[ShipType.Scout]);
        Assert.Equal(1, holding.Ships[ShipType.Colony]);
        Assert.Equal(1, holding.Mines[Element.Iron]);
        Assert.True(holding.HasShipyard);
        Assert.Equal(2, New().Players.Count);
    }

    [Fact]
    public void ApplyAndAdvanceBuildAShip()
    {
        var (state, r) = Engine.Apply(New(), Me, new QueueShip(StartingKit.EarthId, ShipType.Fighter, 1), 0);
        Assert.True(r.Ok);
        var done = Engine.Advance(state, 100000, new FixedDice()).State;
        Assert.Equal(5, done.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!.Ships[ShipType.Fighter]);
    }

    [Fact]
    public void ViewShowsStockpileGrowth()
    {
        var view = Engine.ViewFor(New(), Me, 3600);
        Assert.True(view.Stockpile.Iron > 300);
    }

    [Fact]
    public void ViewListsOwnPlanetsAndHoldings()
    {
        var view = Engine.ViewFor(New(), Me, 0);
        Assert.Equal([StartingKit.EarthId], view.OwnPlanets);
        Assert.Equal(4, view.Holdings.Single().Ships[ShipType.Fighter]);
    }

    [Fact]
    public void ViewRoundTripsThroughJson()
    {
        var view = Engine.ViewFor(New(), Me, 0);
        var json = JsonSerializer.Serialize(view);
        var back = JsonSerializer.Deserialize<PlayerView>(json)!;
        Assert.Equal(json, JsonSerializer.Serialize(back));
        Assert.Equal(view.OwnPlanets, back.OwnPlanets);
    }

    [Fact]
    public void QuoteAddsPrepToFlight()
    {
        var send = new SendFleet(StartingKit.EarthId, new Dictionary<ShipType, int> { [ShipType.Scout] = 1 }, Mars, null);
        var q = Engine.Quote(New(), Me, send, 1000);
        Assert.True(q.Ok);
        Assert.Equal(1300, q.DepartAt);
        Assert.True(q.ArriveAt > q.DepartAt);
    }

    [Fact]
    public void QuoteRejectsMissingShips()
    {
        var send = new SendFleet(StartingKit.EarthId, new Dictionary<ShipType, int> { [ShipType.Dreadnought] = 1 }, Mars, null);
        Assert.Equal("You do not have those ships there.", Engine.Quote(New(), Me, send, 0).Error);
    }

    [Fact]
    public void StateRoundTripsThroughJson()
    {
        var (state, _) = Engine.Apply(New(), Me, new BuildBuilding(StartingKit.EarthId, BuildingType.Defense, null), 0);
        var json = JsonSerializer.Serialize(state);
        var back = JsonSerializer.Deserialize<GameState>(json)!;
        Assert.Equal(json, JsonSerializer.Serialize(back));
        Assert.Equal(state.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!.Queue.Count, back.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!.Queue.Count);
        Assert.Equal(state.PlayerById(Me)!.Stock.Amount, back.PlayerById(Me)!.Stock.Amount);
    }

    private sealed class FixedDice : IDice { public int Roll() => 1; }
}
