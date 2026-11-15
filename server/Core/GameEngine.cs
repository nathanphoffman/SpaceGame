namespace SpaceGame.Core;

/// <summary>The real engine for everything built so far: new games, build queues, upgrades and quotes.</summary>
internal sealed class GameEngine : IGameEngine
{
    private const string NotYet = "That is not available yet.";

    public GameState NewGame(GameSetup setup) =>
        new(setup.Config, 0)
        {
            Planets = [StartingKit.Earth()],
            Players = [.. setup.Players.Select(entry => StartingKit.Player(entry.Id))],
        };

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long nowSeconds, IDice dice) =>
        BuildCompletion.Complete(state, nowSeconds);

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long nowSeconds) =>
        command switch
        {
            BuildBuilding build => BuildQueues.Build(state, player, build, nowSeconds),
            QueueShip ships => BuildQueues.QueueShips(state, player, ships, nowSeconds),
            StartUpgrade upgrade => Upgrades.Start(state, player, upgrade, nowSeconds),
            _ => (state, new CommandResult(false, NotYet)),
        };

    public PlayerView ViewFor(GameState state, PlayerId player, long nowSeconds)
    {
        var stock = state.PlayerById(player)?.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, state.PlayerById(player)!));

        return new(0, nowSeconds, 0, 0, 0, stock?.Amount ?? Resources.Zero, [], []);
    }

    public GalaxyMap Map(GameState state) => new([]);

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long nowSeconds) =>
        FleetQuote.Make(state, player, send, nowSeconds);
}
