using SpaceGame.Core;

namespace SpaceGame.Server.Tests;

/// <summary>Hand-written engine: Advance just moves the state's clock, and the calls are counted.</summary>
public sealed class FakeEngine : IGameEngine
{
    public int AdvanceCalls { get; private set; }

    /// <summary>The kind of the one event Advance reports.</summary>
    public string EventKind { get; set; } = "Tick";

    /// <summary>Event data keys to leave out, to test missing data.</summary>
    public string[] OmittedKeys { get; set; } = [];

    /// <summary>Event data values to replace, to test malformed data.</summary>
    public Dictionary<string, string> DataOverrides { get; set; } = [];

    public GameState NewGame(GameSetup setup) => new(setup.Config, 0);

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long now, IDice dice)
    {
        AdvanceCalls++;

        var data = new Dictionary<string, string> { ["planet"] = "p1", ["attackersWon"] = "true", ["rounds"] = "3", ["winner"] = "team", ["reason"] = "score", ["teamScore"] = "12", ["enemyScore"] = "4", ["contributions"] = """[{"player":"Ann","points":7},{"player":"Bo","points":5}]""" };

        foreach (var key in OmittedKeys)
        {
            data.Remove(key);
        }

        foreach (var (key, value) in DataOverrides)
        {
            data[key] = value;
        }

        return (state with { Time = now }, [new GameEvent(now, EventKind, data)]);
    }

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long now) =>
        (state, new CommandResult(true, null));

    public PlayerView ViewFor(GameState state, PlayerId player, long now) =>
        new(0, now, 0, 0, 0, new Resources(0, 0, 0, 0), [], []) { };

    public GalaxyMap Map(GameState state) => new([new SystemInfo(new SystemId("s1"), "Sol", 0, 0, 0, [])]);

    private const long FlightSeconds = 300;
    private const long ArrivalFlightMultiple = 3;

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long now) =>
        new(true, null, now + FlightSeconds, now + FlightSeconds * ArrivalFlightMultiple);
}
