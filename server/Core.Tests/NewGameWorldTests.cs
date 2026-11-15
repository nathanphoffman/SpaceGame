using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class NewGameWorldTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    private static GameState New(int seed = 1) =>
        Engine.NewGame(new GameSetup(seed, [new PlayerSetup(Me, "Ann"), new PlayerSetup(new PlayerId("p2"), "Bo")], new GameConfig()));

    private static SendFleet Send(PlanetId to) =>
        new(StartingKit.EarthId, new Dictionary<ShipType, int> { [ShipType.Scout] = 1 }, to, null);

    private static long FlightSeconds(PlanetId to)
    {
        return WorldDistance.FlightSeconds(new TravelConfig(), StartingKit.EarthId, to, 1.0);
    }

    [Fact]
    public void EarthIsTheRealEarth()
    {
        var earth = New().PlanetById(StartingKit.EarthId)!;
        Assert.Equal(StarCatalog.Earth.Id, earth.Id);
        Assert.True(earth.RichnessOf(Element.Iron) > earth.RichnessOf(Element.Helium3));
    }

    [Fact]
    public void EveryPlayerHoldsEarth()
    {
        Assert.All(New().Players, p => Assert.NotNull(p.HoldingAt(StartingKit.EarthId)));
    }

    [Fact]
    public void EnemyOwnsItsHomeWorld()
    {
        var state = New();
        Assert.Equal(GalaxyGenerator.Generate(1).EnemyHome.Id, state.EnemyHome);
        Assert.Contains(state.EnemyHome!.Value, state.EnemyPlanets);
        Assert.Equal(GalaxyGenerator.ObjectiveCount, state.Objectives.Count);
    }

    [Fact]
    public void NearestStarTakesAboutFourHours()
    {
        var nearest = StarCatalog.Systems.Skip(1).MinBy(s => s.LightYears)!.Planets[0].Id;
        Assert.InRange(FlightSeconds(nearest), 3 * 3600, 5 * 3600);
    }

    [Fact]
    public void EnemyHomeTakesOneToTwoDays()
    {
        Assert.InRange(FlightSeconds(New().EnemyHome!.Value), 24 * 3600, 48 * 3600);
    }

    [Fact]
    public void InSystemTripUsesAu()
    {
        var jupiter = StarCatalog.Sol.Planets.Single(p => p.Name == "Jupiter").Id;
        Assert.Equal(new TravelConfig().SecondsPerAu * 4.204, FlightSeconds(jupiter), 0);
    }

    [Fact]
    public void QuoteUsesTheRealDistance()
    {
        var quote = Engine.Quote(New(), Me, Send(New().EnemyHome!.Value), 0);
        Assert.InRange(quote.ArriveAt - quote.DepartAt, FlightSeconds(New().EnemyHome!.Value) / 3 - 1, FlightSeconds(New().EnemyHome!.Value) / 3 + 1);
    }

    [Fact]
    public void UnknownDestinationIsRejected()
    {
        Assert.False(Engine.Quote(New(), Me, Send(new PlanetId("nowhere")), 0).Ok);
    }

    [Fact]
    public void WorldStateRoundTripsThroughJson()
    {
        var json = JsonSerializer.Serialize(New());
        Assert.Equal(json, JsonSerializer.Serialize(JsonSerializer.Deserialize<GameState>(json)));
    }
}
