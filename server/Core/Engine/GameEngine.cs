namespace SpaceGame.Core;

/// <summary>The real engine for everything built so far: new games, build queues, upgrades and quotes.</summary>
internal sealed class GameEngine : IGameEngine
{
    private const string NotYet = "That is not available yet.";

    public GameState NewGame(GameSetup setup)
    {
        var galaxy = GalaxyGenerator.Generate(setup.Seed);

        return new(setup.Config, 0)
        {
            Planets = [.. galaxy.Systems.SelectMany(s => s.Planets).Select(ToPlanetData)],
            EnemyHome = galaxy.EnemyHome.Id,
            EnemyPlanets = [galaxy.EnemyHome.Id],
            Objectives = [.. galaxy.Objectives.Select(o => o.Id)],
            Players = [.. setup.Players.Select(entry => StartingKit.Player(entry.Id))],
        };
    }

    private static PlanetData ToPlanetData(WorldPlanet planet) =>
        new(planet.Id, Enum.GetValues<Element>().ToDictionary(e => e, planet.Richness.Of));

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long nowSeconds, IDice dice) =>
        Move(BuildCompletion.Complete(state, nowSeconds), nowSeconds);

    private static (GameState State, IReadOnlyList<GameEvent> Events) Move(
        (GameState State, IReadOnlyList<GameEvent> Events) built, long nowSeconds)
    {
        var events = built.Events.ToList();
        var state = FleetArrivals.Resolve(built.State, nowSeconds, events);

        return (state, [.. events.OrderBy(e => e.Time)]);
    }

    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long nowSeconds) =>
        command switch
        {
            BuildBuilding build => BuildQueues.Build(state, player, build, nowSeconds),
            QueueShip ships => BuildQueues.QueueShips(state, player, ships, nowSeconds),
            StartUpgrade upgrade => Upgrades.Start(state, player, upgrade, nowSeconds),
            CancelQueueItem cancel => QueueCancel.Cancel(state, player, cancel, nowSeconds),
            SendFleet send => FleetOrders.Send(state, player, send, nowSeconds),
            RecallFleet recall => FleetOrders.Recall(state, player, recall, nowSeconds),
            _ => (state, new CommandResult(false, NotYet)),
        };

    public PlayerView ViewFor(GameState state, PlayerId player, long nowSeconds)
    {
        var own = state.PlayerById(player);
        var stock = own?.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, own));
        IReadOnlyList<Holding> holdings = own?.Holdings ?? [];

        return new(0, nowSeconds, 0, 0, 0, stock?.Amount ?? Resources.Zero, OwnFleets(state, player), [])
        {
            OwnPlanets = [.. holdings.Select(h => h.Planet)],
            Holdings = holdings,
        };
    }

    private static IReadOnlyList<FleetView> OwnFleets(GameState state, PlayerId player) =>
        [.. state.Fleets.Where(f => f.Owner == player).Select(f => f.ToView())];

    public GalaxyMap Map(GameState state) => new([]);

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long nowSeconds) =>
        FleetQuote.Make(state, player, send, nowSeconds);
}
