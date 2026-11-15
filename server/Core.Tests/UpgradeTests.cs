namespace SpaceGame.Core.Tests;

public class UpgradeTests
{
    private static readonly PlayerId Me = new("p1");
    private static readonly PlanetId Earth = new("earth");
    private const int Hour = 3600;
    private static readonly Catalog Cat = Catalog.Default;

    private static GameState Game(Resources? stock = null, Holding? holding = null)
    {
        var rich = new Dictionary<Element, int> { [Element.Iron] = 100 };
        var player = new PlayerState(Me, Stockpile.Start(stock ?? new Resources(0, 0, 1000, 1000), 0), [holding ?? new Holding(Earth)]);

        return new GameState(new GameConfig(), 0) { Planets = [new PlanetData(Earth, rich)], Players = [player] };
    }

    private static (GameState State, CommandResult Result) Start(GameState state, UpgradeType t, long nowSeconds = 0) =>
        GameEngineFactory.Create().Apply(state, Me, new StartUpgrade(t), nowSeconds);

    private static GameState Finish(GameState state, long nowSeconds) => GameEngineFactory.Create().Advance(state, nowSeconds, new ScriptedDiceStub()).State;

    private static PlayerState Me_(GameState state) => state.PlayerById(Me)!;

    private sealed class ScriptedDiceStub : IDice { public int Roll() => 1; }

    [Fact]
    public void StartTakesCostAndSetsResearch()
    {
        var (state, r) = Start(Game(), UpgradeType.Engines);
        Assert.True(r.Ok);
        Assert.Equal(new Resources(0, 0, 960, 990), Me_(state).Stock.Amount);
        Assert.Equal(2 * Hour, Me_(state).Research!.FinishAt);
    }

    [Fact]
    public void UnknownPlayerRejected() =>
        Assert.Equal("You are not in this game.",
            GameEngineFactory.Create().Apply(Game(), new PlayerId("x"), new StartUpgrade(UpgradeType.Armor), 0).Result.Error);

    [Fact]
    public void NotEnoughResourcesRejected() =>
        Assert.Equal("Not enough resources.", Start(Game(new Resources(0, 0, 10, 0)), UpgradeType.Weapons).Result.Error);

    [Fact]
    public void OnlyOneResearchAtATime()
    {
        var (state, _) = Start(Game(), UpgradeType.Engines);
        Assert.Equal("Another upgrade is already being researched.", Start(state, UpgradeType.Armor).Result.Error);
    }

    [Fact]
    public void CompletionRaisesLevelAndRespectsCap()
    {
        var state = Game();

        for (var level = 1; level <= 3; level++)
        {
            state = Finish(Start(state, UpgradeType.Engines, (level - 1) * 10 * Hour).State, level * 10 * Hour - 5 * Hour);
            Assert.Equal(level, Me_(state).UpgradeLevel(UpgradeType.Engines));
        }

        Assert.Equal("Engines is already at its top level.", Start(state, UpgradeType.Engines, 40 * Hour).Result.Error);
    }

    [Fact]
    public void LaterLevelsCostMore()
    {
        var state = Finish(Start(Game(), UpgradeType.Mining).State, 3 * Hour);
        var before = Me_(state).Stock.Amount;
        var after = Me_(Start(state, UpgradeType.Mining, 3 * Hour).State).Stock.Amount;
        Assert.Equal(Cat.Upgrade(UpgradeType.Mining).CostAtLevel(2), before - after);
    }

    [Fact]
    public void NotFinishedBeforeItsTime()
    {
        var state = Finish(Start(Game(), UpgradeType.Armor).State, Hour);
        Assert.Equal(0, Me_(state).UpgradeLevel(UpgradeType.Armor));
        Assert.NotNull(Me_(state).Research);
    }

    [Fact]
    public void EnginesRaiseFleetSpeed()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Engines).State, 3 * Hour));
        var ships = new Dictionary<ShipType, int> { [ShipType.Hauler] = 1 };
        Assert.Equal(1.25, Upgrades.FleetSpeed(Cat, p, ships), 6);
    }

    [Fact]
    public void WeaponsLowerHitNumberButNotBelowTwoAndSkipUnarmed()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Weapons).State, 5 * Hour));
        Assert.Equal(4, Upgrades.BattleShipFor(Cat, p, ShipType.Fighter).HitsOn);
        Assert.Equal(2, Upgrades.BattleShipFor(Cat, p, ShipType.Dreadnought).HitsOn);
        Assert.Equal(0, Upgrades.BattleShipFor(Cat, p, ShipType.Scout).HitsOn);
    }

    [Fact]
    public void ArmorAddsHpToFightersAndBattleshipsOnly()
    {
        var p = Me_(Finish(Start(Game(), UpgradeType.Armor).State, 4 * Hour));
        Assert.Equal(2, Upgrades.BattleShipFor(Cat, p, ShipType.Fighter).Hp);
        Assert.Equal(5, Upgrades.BattleShipFor(Cat, p, ShipType.Battleship).Hp);
        Assert.Equal(10, Upgrades.BattleShipFor(Cat, p, ShipType.Dreadnought).Hp);
    }

    [Fact]
    public void MiningUpgradeRaisesIncomeFromItsFinishTime()
    {
        var holding = new Holding(Earth) { Mines = new Dictionary<Element, int> { [Element.Iron] = 1 } };
        var state = Game(new Resources(0, 0, 100, 100), holding);
        var started = Start(state, UpgradeType.Mining).State;
        var done = Finish(started, 4 * Hour);

        // 2h at 20/h, then 2h at 26/h
        Assert.Equal(40 + 52, Me_(done).Stock.Amount.Iron);
    }
}
