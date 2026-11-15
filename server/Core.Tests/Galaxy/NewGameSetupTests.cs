using System.Text.Json;

namespace SpaceGame.Core.Tests;

public class NewGameSetupTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly IGameEngine Engine = GameEngineFactory.Create();

    private static GameState SetupGame(int seed = 1) =>
        Engine.NewGame(new GameSetup(seed, [new PlayerSetup(Me, "Ann"), new PlayerSetup(new PlayerId("p2"), "Bo")], new GameConfig()));

    [Fact]
    public void EarthIsTheRealEarth()
    {
        var earth = SetupGame().PlanetById(StartingKit.EarthId)!;
        Assert.Equal(StarCatalog.Earth.Id, earth.Id);
        Assert.True(earth.RichnessOf(Element.Iron) > earth.RichnessOf(Element.Helium3));
    }

    [Fact]
    public void EveryPlayerHoldsEarth()
    {
        Assert.All(SetupGame().Players, p => Assert.NotNull(p.HoldingAt(StartingKit.EarthId)));
    }

    [Fact]
    public void EnemyOwnsItsHomeWorld()
    {
        var state = SetupGame();
        Assert.Equal(GalaxyGenerator.Generate(1).EnemyHome.Id, state.EnemyHome);
        Assert.Contains(state.EnemyHome!.Value, state.EnemyPlanets);
        Assert.Equal(GalaxyGenerator.ObjectiveCount, state.Objectives.Count);
    }

    [Fact]
    public void WorldStateRoundTripsThroughJson()
    {
        var json = JsonSerializer.Serialize(SetupGame());
        Assert.Equal(json, JsonSerializer.Serialize(JsonSerializer.Deserialize<GameState>(json)));
    }
}
