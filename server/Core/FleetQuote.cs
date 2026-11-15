namespace SpaceGame.Core;

/// <summary>Trip timer for a send order. Real distances come with the galaxy; until then every trip is one default distance.</summary>
internal static class FleetQuote
{
    /// <summary>Distance used for every trip until the galaxy supplies real ones.</summary>
    public const double PlaceholderAu = 1;

    public static FlightQuote Make(GameState state, PlayerId playerId, SendFleet send, long nowSeconds)
    {
        var problem = Problem(state, playerId, send);

        if (problem is not null) return new(false, problem, nowSeconds, nowSeconds);
        var player = state.PlayerById(playerId)!;
        var speed = TravelRules.FleetSpeed(state.Config.Catalog, send.Ships, player.UpgradeLevel(UpgradeType.Engines));
        var flight = TravelRules.FlightSecondsInSystem(state.Config.Travel, PlaceholderAu, speed);

        return TravelRules.Quote(nowSeconds, state.Config.PrepSeconds, flight);
    }

    private static string? Problem(GameState state, PlayerId playerId, SendFleet send)
    {
        var holding = state.PlayerById(playerId)?.HoldingAt(send.From);

        if (holding is null) return "You have no base on that planet.";

        if (send.Ships.Count == 0 || send.Ships.Values.All(count => count <= 0)) return "Choose at least one ship.";

        if (send.Ships.Any(ship => ship.Value > holding.Ships.GetValueOrDefault(ship.Key))) return "You do not have those ships there.";

        return null;
    }
}
