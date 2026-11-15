namespace SpaceGame.Core;

internal static partial class FleetBattles
{
    /// <summary>Writes the surviving defenders back, taking the losses and the damage from the garrisons in order.</summary>
    private static GameState Survive(
        GameState state, PlanetId planet, List<Garrison> defenders, BattleSide survivors, Side side, long nowSeconds)
    {
        var alive = Count(survivors);
        var hurt = ShipDamage.Tally(survivors, type => FullHp(state, defenders[0].Owner, side, type));
        var result = state;

        foreach (var garrison in defenders)
        {
            var kept = new Dictionary<ShipType, int>();
            var damage = new Dictionary<ShipType, int>();

            foreach (var (type, count) in garrison.Ships.OrderBy(s => s.Key))
            {
                var keep = Math.Min(count, alive.GetValueOrDefault(type));
                var cap = keep * (FullHp(state, garrison.Owner, side, type) - 1);
                var share = Math.Min(hurt.GetValueOrDefault(type), cap);
                alive[type] = alive.GetValueOrDefault(type) - keep;
                hurt[type] = hurt.GetValueOrDefault(type) - share;

                if (keep > 0) kept[type] = keep;

                if (share > 0) damage[type] = share;
            }

            result = Replace(result, planet, garrison, kept, damage, nowSeconds);
        }

        return result;
    }

    private static GameState Replace(
        GameState state, PlanetId planet, Garrison garrison, Dictionary<ShipType, int> kept,
        Dictionary<ShipType, int> damage, long nowSeconds)
    {
        if (garrison.Fleet is { } fleet)
        {
            var others = state.Fleets.Where(f => f.Id != fleet.Id);

            return state with { Fleets = [.. others, .. kept.Count == 0 ? [] : new[] { fleet with { Ships = kept, Damage = damage } }] };
        }

        var player = state.PlayerById(garrison.BaseOwner!.Value)!;
        var holding = player.HoldingAt(planet)!;

        return state.WithPlayer(player.WithHolding(holding with { Ships = kept, Damage = damage, DamagedAt = nowSeconds }));
    }
}
