namespace SpaceGame.Core.Tests;

/// <summary>Shared setup for the fleet tests: one player at Earth with the starting kit.</summary>
internal static class FleetFixture
{
    public static readonly PlayerId Me = new("p1");
    public static readonly IGameEngine Engine = GameEngineFactory.Create();
    public static readonly PlanetId Target = StarCatalog.Systems.Skip(1).MinBy(s => s.LightYears)!.Planets[0].Id;
    public const long Prep = 300;
    private const long NeverTicks = 1_000_000_000;

    public static GameState FleetGame() =>
        Engine.NewGame(new GameSetup(1, [new PlayerSetup(Me, "Ann")], new GameConfig { Enemy = new EnemyConfig(TickSeconds: NeverTicks) }));

    public static SendFleet Send(int fighters = 2, Resources? cargo = null, int haulers = 0)
    {
        var ships = new Dictionary<ShipType, int> { [ShipType.Fighter] = fighters };

        if (haulers > 0) ships[ShipType.Hauler] = haulers;

        return new(StartingKit.EarthId, ships, Target, cargo);
    }

    public static (GameState State, CommandResult Result) Do(GameState state, GameCommand command, long nowSeconds = 0) =>
        Engine.Apply(state, Me, command, nowSeconds);

    public static GameState Sent(long nowSeconds = 0) => Do(FleetGame(), Send(), nowSeconds).State;

    public static int FightersHome(GameState state) =>
        state.PlayerById(Me)!.HoldingAt(StartingKit.EarthId)!.Ships.GetValueOrDefault(ShipType.Fighter);
}

/// <summary>Dice that always roll the same value.</summary>
internal sealed class SeqDice : IDice
{
    private const int AlwaysRolls = 3;

    public int Roll() => AlwaysRolls;
}
