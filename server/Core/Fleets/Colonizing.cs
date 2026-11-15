namespace SpaceGame.Core;

/// <summary>Applies Colonize: a parked Colony ship claims the planet it sits at.</summary>
public static class Colonizing
{
    /// <summary>
    /// Uses one Colony ship from the player's parked fleet at the planet. The planet must be unowned, or the
    /// enemy's with no enemy ships left there. The enemy loses its claim (and with it any buildings).
    /// </summary>
    public static (GameState State, CommandResult Result) Colonize(
        GameState state, PlayerId playerId, Colonize command, long nowSeconds)
    {
        var player = state.PlayerById(playerId);
        var planet = command.Planet;
        var fleet = state.Fleets.FirstOrDefault(f =>
            f.Owner == playerId && f.Parked && f.To == planet && f.Ships.GetValueOrDefault(ShipType.Colony) > 0);
        var problem = Problem(state, player, planet, fleet);

        if (problem is not null) return (state, new CommandResult(false, problem));
        var rest = state.Fleets.Where(f => f.Id != fleet!.Id);
        var ships = fleet!.Ships.ToDictionary(s => s.Key, s => s.Value);
        ships[ShipType.Colony]--;

        // Copy the ships that are left, leaving out types with none remaining.
        var remaining = ships.Where(s => s.Value > 0).ToDictionary(s => s.Key, s => s.Value);

        // The new colony is a base now, so any cargo the fleet carried is delivered rather than lost with the last ship.
        var stock = player!.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player)).Add(fleet.Cargo);
        var claimed = state.WithPlayer((player with { Stock = stock }) with
        {
            Holdings = [.. player.Holdings, new Holding(planet) { DamagedAt = nowSeconds }],
        });

        var moved = claimed with
        {
            Fleets = [.. rest, .. remaining.Count == 0 ? [] : new[] { fleet with { Ships = remaining, Cargo = Resources.Zero } }],
            EnemyPlanets = [.. state.EnemyPlanets.Where(p => p != planet)],
        };

        var captured = Scoring.Capture(moved, Side.Team, planet, nowSeconds, playerId);
        var won = planet == state.EnemyHome ? Endgame.EndPending(captured, Side.Team, Endgame.HomeCapturedReason, nowSeconds) : captured;

        return (won, new CommandResult(true, null));
    }

    // Returns why the colony ship cannot claim the planet, or null when it can.
    private static string? Problem(GameState state, PlayerState? player, PlanetId planet, Fleet? fleet)
    {
        if (player is null) return "You are not in this game.";

        if (fleet is null) return "You need a Colony ship waiting at that planet.";

        if (state.Players.Any(p => p.HoldingAt(planet) is not null)) return "Your team already holds that planet.";
        var enemyShips = state.Fleets.Any(f => f.Parked && f.To == planet && f.Side == Side.Enemy);

        return enemyShips ? "Enemy ships are still at that planet." : null;
    }
}
