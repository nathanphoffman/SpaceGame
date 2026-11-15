namespace SpaceGame.Core.Tests;

/// <summary>Shared setup for the build queue tests.</summary>
internal static class QueueFixture
{
    internal static readonly PlayerId Me = new("p1");
    internal static readonly PlanetId Earth = new("earth");
    internal static readonly PlanetId Moon = new("moon");
    internal const int Minute = 60;

    internal static GameState Game(Resources? stock = null, Holding? holding = null)
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

    internal static Holding WithYard() => new(Earth) { HasShipyard = true };

    internal static (GameState State, CommandResult Result) Do(GameState state, GameCommand c, long nowSeconds = 0) =>
        GameEngineFactory.Create().Apply(state, Me, c, nowSeconds);

    internal static string? Error(GameState state, GameCommand c, long nowSeconds = 0) => Do(state, c, nowSeconds).Result.Error;

    internal static Holding At(GameState state) => state.PlayerById(Me)!.HoldingAt(Earth)!;

    internal sealed class FixedDice : IDice
    {
        public int Roll() => 3;
    }
}
