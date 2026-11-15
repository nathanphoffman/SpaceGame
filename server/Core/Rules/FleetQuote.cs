namespace SpaceGame.Core;

/// <summary>Trip timer for a send order, from the real distances between the two planets.</summary>
internal static class FleetQuote
{
    public static FlightQuote Make(GameState state, PlayerId playerId, SendFleet send, long nowSeconds)
    {
        var problem = Problem(state, playerId, send);

        if (problem is not null) return new(false, problem, nowSeconds, nowSeconds);
        var player = state.PlayerById(playerId)!;
        var speed = TravelRules.FleetSpeed(state.Config.Catalog, send.Ships, player.UpgradeLevel(UpgradeType.Engines));
        var flight = WorldDistance.FlightSeconds(state.Config.Travel, send.From, send.To, speed);

        return TravelRules.Quote(nowSeconds, state.Config.PrepSeconds, flight);
    }

    internal static string? Problem(GameState state, PlayerId playerId, SendFleet send)
    {
        var holding = state.PlayerById(playerId)?.HoldingAt(send.From);

        if (holding is null) return "You have no base on that planet.";

        if (!WorldDistance.Exists(send.To)) return "That planet does not exist.";

        if (send.From == send.To) return "Choose a different destination.";

        if (send.Ships.Count == 0 || send.Ships.Values.All(count => count <= 0)) return "Choose at least one ship.";

        if (send.Ships.Any(ship => ship.Value > holding.Ships.GetValueOrDefault(ship.Key))) return "You do not have those ships there.";

        return null;
    }
}
