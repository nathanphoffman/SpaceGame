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
            EnemyBudget = HomeGarrisonCost(setup.Config),
            Planets = [.. galaxy.Systems.SelectMany(s => s.Planets).Select(ToPlanetData)],
            EnemyHome = galaxy.EnemyHome.Id,
            EnemyPlanets = [galaxy.EnemyHome.Id],
            Objectives = [.. galaxy.Objectives.Select(o => o.Id)],
            Players = [.. setup.Players.Select(entry => StartingKit.Player(entry.Id))],
        };
    }

    // The enemy starts with savings that buy its full home garrison at the first tick.
    private static int HomeGarrisonCost(GameConfig config) =>
        config.Enemy.HomeGarrisonFighters * config.Catalog.Ship(ShipType.Fighter).Cost.Total;

    // Every element on the planet starts with the richness the world catalog gives it.
    private static PlanetData ToPlanetData(WorldPlanet planet) =>
        new(planet.Id, Enum.GetValues<Element>().ToDictionary(e => e, planet.Richness.Of));

    public (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long nowSeconds, IDice dice) =>
        Move(BuildCompletion.Complete(state, nowSeconds), nowSeconds, dice);

    private static (GameState State, IReadOnlyList<GameEvent> Events) Move(
        (GameState State, IReadOnlyList<GameEvent> Events) built, long nowSeconds, IDice dice)
    {
        var events = built.Events.ToList();
        var state = Visibility.Announce(FleetArrivals.Resolve(EnemyTurns.Run(built.State, nowSeconds, events, dice), nowSeconds, events, dice), nowSeconds, events);

        return (state, [.. events.OrderBy(e => e.Time)]);
    }

    // Routes each command type to the rule that handles it.
    public (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long nowSeconds) =>
        command switch
        {
            BuildBuilding build => BuildQueues.QueueBuilding(state, player, build, nowSeconds),
            QueueShip ships => BuildQueues.QueueShips(state, player, ships, nowSeconds),
            StartUpgrade upgrade => Upgrades.BeginResearch(state, player, upgrade, nowSeconds),
            CancelQueueItem cancel => QueueCancel.Cancel(state, player, cancel, nowSeconds),
            SendFleet send => FleetOrders.Send(state, player, send, nowSeconds),
            RecallFleet recall => FleetOrders.Recall(state, player, recall, nowSeconds),
            Colonize colonize => Colonizing.Colonize(state, player, colonize, nowSeconds),
            _ => (state, new CommandResult(false, NotYet)),
        };

    public PlayerView ViewFor(GameState state, PlayerId player, long nowSeconds)
    {
        var own = state.PlayerById(player);
        var stock = own?.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, own));
        IReadOnlyList<Holding> holdings = own?.Holdings ?? [];

        return new(0, nowSeconds, 0, 0, 0, stock?.Amount ?? Resources.Zero, Visibility.FleetsFor(state, player, nowSeconds), [])
        {
            OwnPlanets = [.. holdings.Select(h => h.Planet)],
            Holdings = holdings,
            Upgrades = Enum.GetValues<UpgradeType>().ToDictionary(type => type, type => own?.UpgradeLevel(type) ?? 0),
        };
    }

    public GalaxyMap Map(GameState state) => new([]);

    public FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long nowSeconds) =>
        FleetQuote.Make(state, player, send, nowSeconds);
}
