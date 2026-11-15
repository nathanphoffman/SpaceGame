using System.Text.Json;
using static SpaceGame.Core.Tests.FleetFixture;

namespace SpaceGame.Core.Tests;

internal static class EndgameFixture
{
    internal const long Hour = 3600;
    internal static readonly PlanetId Objective = FleetGame().Objectives[0];

    internal static GameState WithScores(int team, int enemy) => FleetGame() with { TeamScore = team, EnemyScore = enemy };

    internal static GameState TeamHolds(GameState state) =>
        state.WithPlayer(state.PlayerById(Me)! is var p ? p with { Holdings = [.. p.Holdings, new Holding(Objective)] } : p);

    internal static GameEvent Ended(IReadOnlyList<GameEvent> events) => Assert.Single(events, e => e.Kind == "GameEnded");

    internal static Fleet ColonyAt(PlanetId planet) =>
        new(new FleetId("x1"), Me, StartingKit.EarthId, planet, 0, 0, 0,
            new Dictionary<ShipType, int> { [ShipType.Colony] = 1 }, Resources.Zero, Parked: true, Side: Side.Team);
}
