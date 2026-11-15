using SpaceGame.Core;

namespace SpaceGame.Server.Tests;

/// <summary>Hand-written engine: Advance just moves the state's clock, and the calls are counted.</summary>
public sealed class FakeEngine : IGameEngine
{
    public int AdvanceCalls { get; private set; }

    public GameState NewGame(GameSetup setup) => new(setup.Config, 0);

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long now, IDice dice)
    {
        AdvanceCalls++;

        return (state with { Time = now }, [new GameEvent(now, "Tick", new Dictionary<string, string>())]);
    }

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long now) =>
        (state, new CommandResult(true, null));

    public PlayerView ViewFor(GameState state, PlayerId player, long now) =>
        new(0, now, 0, 0, 0, new Resources(0, 0, 0, 0), [], []) { };

    public GalaxyMap Map(GameState state) => new([new SystemInfo(new SystemId("s1"), "Sol", 0, 0, 0, [])]);

    private const long FlightSeconds = 300;

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long now) =>
        new(true, null, now + FlightSeconds, now + FlightSeconds * 3);
}
