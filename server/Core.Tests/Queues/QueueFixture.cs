namespace SpaceGame.Core.Tests;

/// <summary>Shared setup for the build queue tests.</summary>
internal static class QueueFixture
{
    internal static readonly PlayerId Me = new("p1");
    internal static readonly PlanetId Earth = new("earth");
    internal static readonly PlanetId Moon = new("moon");
    internal const int Minute = 60;
    private const int EarthIron = 100;
    private const int EarthHydrogen = 50;
    private const int EarthTitanium = 80;
    private const int StartingStock = 1000;
    private const int FixedRoll = 3;

    internal static GameState Game(Resources? stock = null, Holding? holding = null)
    {
        var rich = new Dictionary<Element, int> { [Element.Iron] = EarthIron, [Element.Hydrogen] = EarthHydrogen, [Element.Titanium] = EarthTitanium };
        var player = new PlayerState(Me, Stockpile.Open(stock ?? new Resources(StartingStock, StartingStock, StartingStock, StartingStock), 0),
            [holding ?? new Holding(Earth)]);

        return new GameState(new GameConfig(), 0)
        {
            Planets = [new PlanetData(Earth, rich), new PlanetData(Moon, new Dictionary<Element, int>())],
            Players = [player],
        };
    }

    internal static Holding WithYard() => new(Earth) { HasShipyard = true };

    internal static (GameState State, CommandResult Result) Do(GameState state, GameCommand command, long nowSeconds = 0) =>
        GameEngineFactory.Create().Apply(state, Me, command, nowSeconds);

    internal static string? Error(GameState state, GameCommand command, long nowSeconds = 0)
    {
        var (_, outcome) = Do(state, command, nowSeconds);

        return outcome.Error;
    }

    internal static Holding At(GameState state) => state.PlayerById(Me)!.HoldingAt(Earth)!;

    internal sealed class FixedDice : IDice
    {
        public int Roll() => FixedRoll;
    }
}
