namespace SpaceGame.Core.Tests;

/// <summary>Shared setup for the upgrade tests.</summary>
internal static class UpgradeFixture
{
    internal static readonly PlayerId Me = new("p1");
    internal static readonly PlanetId Earth = new("earth");
    internal const int Hour = 3600;
    internal static readonly Catalog Cat = Catalog.Default;

    internal static GameState Game(Resources? stock = null, Holding? holding = null)
    {
        var rich = new Dictionary<Element, int> { [Element.Iron] = 100 };
        var player = new PlayerState(Me, Stockpile.Start(stock ?? new Resources(0, 0, 1000, 1000), 0), [holding ?? new Holding(Earth)]);

        return new GameState(new GameConfig(), 0) { Planets = [new PlanetData(Earth, rich)], Players = [player] };
    }

    internal static (GameState State, CommandResult Result) Start(GameState state, UpgradeType t, long nowSeconds = 0) =>
        GameEngineFactory.Create().Apply(state, Me, new StartUpgrade(t), nowSeconds);

    internal static GameState Finish(GameState state, long nowSeconds) => GameEngineFactory.Create().Advance(state, nowSeconds, new ScriptedDiceStub()).State;

    internal static PlayerState Me_(GameState state) => state.PlayerById(Me)!;

    internal sealed class ScriptedDiceStub : IDice { public int Roll() => 1; }
}
