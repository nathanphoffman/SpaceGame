using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

public class ColonizeTests
{
    private static Fleet Parked(Side side, ShipType type, int count, string id = "x1") =>
        new(new FleetId(id), side == Side.Team ? Me : new PlayerId("enemy"), StartingKit.EarthId, Target, 0, 0, 0,
            new Dictionary<ShipType, int> { [type] = count }, Resources.Zero, Parked: true, Side: side);

    private static GameState WithFleets(params Fleet[] fleets) => FleetGame() with { Fleets = fleets };

    [Fact]
    public void ColonyShipClaimsAnUnownedPlanet()
    {
        var (after, result) = Do(WithFleets(Parked(Side.Team, ShipType.Colony, 1)), new Colonize(Target), 500);
        Assert.True(result.Ok);
        Assert.NotNull(after.PlayerById(Me)!.HoldingAt(Target));
        Assert.Empty(after.Fleets);
    }

    [Fact]
    public void OtherShipsStayParkedAfterColonizing()
    {
        var fleet = Parked(Side.Team, ShipType.Colony, 2) with
        {
            Ships = new Dictionary<ShipType, int> { [ShipType.Colony] = 2, [ShipType.Fighter] = 1 },
        };

        var after = Do(WithFleets(fleet), new Colonize(Target)).State;
        var left = Assert.Single(after.Fleets).Ships;
        Assert.Equal((1, 1), (left[ShipType.Colony], left[ShipType.Fighter]));
    }

    [Fact]
    public void ColonizingDeliversTheFleetsCargo()
    {
        var fleet = Parked(Side.Team, ShipType.Colony, 1) with { Cargo = new Resources(0, 70, 0, 0) };
        var before = WithFleets(fleet).PlayerById(Me)!.Stock.Amount.Hydrogen;
        var after = Do(WithFleets(fleet), new Colonize(Target)).State;
        Assert.Equal(before + 70, after.PlayerById(Me)!.Stock.Amount.Hydrogen);
    }

    [Fact]
    public void ColonizeWithoutAColonyShipFails()
    {
        var (_, result) = Do(WithFleets(Parked(Side.Team, ShipType.Fighter, 3)), new Colonize(Target));
        Assert.False(result.Ok);
    }

    [Fact]
    public void ColonizeAPlanetTheTeamHoldsFails()
    {
        var (_, result) = Do(WithFleets(Parked(Side.Team, ShipType.Colony, 1)), new Colonize(StartingKit.EarthId));
        Assert.False(result.Ok);
    }

    [Fact]
    public void ColonizeFailsWhileEnemyShipsAreThere()
    {
        var state = WithFleets(Parked(Side.Team, ShipType.Colony, 1), Parked(Side.Enemy, ShipType.Fighter, 2, "e1")) with
        {
            EnemyPlanets = [Target],
        };

        var (after, result) = Do(state, new Colonize(Target));
        Assert.False(result.Ok);
        Assert.Contains(Target, after.EnemyPlanets);
    }

    [Fact]
    public void ColonizingAnEnemyPlanetTakesItFromTheEnemy()
    {
        var state = WithFleets(Parked(Side.Team, ShipType.Colony, 1)) with { EnemyPlanets = [Target] };
        var (after, result) = Do(state, new Colonize(Target));
        Assert.True(result.Ok);
        Assert.Empty(after.EnemyPlanets);
        Assert.NotNull(after.PlayerById(Me)!.HoldingAt(Target));
    }
}
