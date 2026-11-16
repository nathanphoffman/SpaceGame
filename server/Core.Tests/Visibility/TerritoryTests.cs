using static SpaceGame.Core.Tests.VisibilityFixture;

namespace SpaceGame.Core.Tests;

public class TerritoryTests
{
    private static readonly PlayerId Friend = new("p2");

    private static GameState WithFriendAt(PlanetId planet)
    {
        var state = FleetFixture.FleetGame();
        var friend = new PlayerState(Friend, state.PlayerById(FleetFixture.Me)!.Stock, [new Holding(planet)]);

        return state with { Players = [.. state.Players, friend] };
    }

    private static IReadOnlyList<PlanetControl> Of(GameState state) => FleetFixture.Engine.ViewFor(state, FleetFixture.Me, 0).Territory;

    [Fact]
    public void OwnAndAllyPlanetsAreMarked()
    {
        var far = PlanetInSystem(SystemAtHops(3));
        var territory = Of(WithFriendAt(far));

        Assert.Contains(new PlanetControl(StartingKit.EarthId, Control.Mine), territory);
        Assert.Contains(new PlanetControl(far, Control.Ally), territory);
    }

    [Fact]
    public void EnemyPlanetIsKnownOnlyWhereATeammateIs()
    {
        var withTeam = PlanetInSystem(SolId);
        var elsewhere = PlanetInSystem(SystemAtHops(3));
        var state = FleetFixture.FleetGame() with { EnemyPlanets = [withTeam, elsewhere] };
        var territory = Of(state);

        Assert.Contains(new PlanetControl(withTeam, Control.Hostile), territory);
        Assert.DoesNotContain(territory, c => c.Planet == elsewhere);
    }
}
