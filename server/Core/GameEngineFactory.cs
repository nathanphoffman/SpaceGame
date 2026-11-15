namespace SpaceGame.Core;

/// <summary>Creates the engine.</summary>
public static class GameEngineFactory
{
    /// <summary>Returns the real engine (a stub until the core milestones land).</summary>
    public static IGameEngine Create() => new StubGameEngine();
}

internal sealed class StubGameEngine : IGameEngine
{
    private const string Todo = "Core is not built yet.";

    public GameState NewGame(GameSetup setup) => new(setup.Config, 0);

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long now, IDice dice) =>
        (state with { Time = now }, []);

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long now) =>
        (state, new CommandResult(false, Todo));

    public PlayerView ViewFor(GameState state, PlayerId player, long now) =>
        new(0, now, 0, 0, 0, Resources.Zero, [], []);

    public GalaxyMap Map(GameState state) => new([]);

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long now) =>
        new(false, Todo, now, now);
}
