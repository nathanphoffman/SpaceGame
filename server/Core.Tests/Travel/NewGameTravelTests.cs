namespace SpaceGame.Core.Tests;

public class NewGameTravelTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    private static GameState TravelGame(int seed = 1) =>
        Engine.NewGame(new GameSetup(seed, [new PlayerSetup(Me, TestNames.Ann), new PlayerSetup(new PlayerId("p2"), "Bo")], new GameConfig()));

    private static SendFleet Send(PlanetId to) =>
        new(StartingKit.EarthId, new Dictionary<ShipType, int> { [ShipType.Scout] = 1 }, to, null);

    private static long FlightSeconds(PlanetId to)
    {
        return WorldDistance.FlightSeconds(new TravelConfig(), StartingKit.EarthId, to, 1.0);
    }

    [Theory]
    [InlineData(false, 3, 5)] // nearest star: about four hours
    [InlineData(true, 24, 48)] // enemy home: one to two days
    public void FarTripsTakeHours(bool enemyHome, int minHours, int maxHours)
    {
        var to = enemyHome
            ? TravelGame().EnemyHome!.Value
            : StarCatalog.Systems.Skip(1).MinBy(s => s.LightYears)!.Planets[0].Id;
        Assert.InRange(FlightSeconds(to), minHours * 3600, maxHours * 3600);
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
        var quote = Engine.Quote(TravelGame(), Me, Send(TravelGame().EnemyHome!.Value), 0);
        Assert.InRange(quote.ArriveAt - quote.DepartAt, FlightSeconds(TravelGame().EnemyHome!.Value) / 3 - 1, FlightSeconds(TravelGame().EnemyHome!.Value) / 3 + 1);
    }

    [Fact]
    public void UnknownDestinationIsRejected()
    {
        Assert.False(Engine.Quote(TravelGame(), Me, Send(new PlanetId("nowhere")), 0).Ok);
    }
}
