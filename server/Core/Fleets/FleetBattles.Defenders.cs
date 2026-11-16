namespace SpaceGame.Core;

internal static partial class FleetBattles
{
    private static List<Garrison> Defenders(GameState state, Fleet attacker)
    {
        var planet = attacker.To;
        var defenders = state.Fleets
            .Where(f => f.Parked && f.To == planet && f.Side == Opposite(attacker.Side))
            .Select(f => new Garrison(f, null, f.Ships, f.Damage)).ToList();

        if (attacker.Side != Side.Enemy) return defenders;

        // Pair every player with their holding here, then keep only players who actually have one.
        var bases = state.Players.Select(p => (p.Id, Holding: p.HoldingAt(planet))).Where(x => x.Holding is not null);

        var catalog = state.Config.Catalog;

        foreach (var (id, holding) in bases)
        {
            var healed = ShipDamage.Healed(
                state.Config, holding!, type => catalog.Ship(type).Hp, attacker.ArriveAt);

            defenders.Add(new Garrison(null, id, holding!.Ships, healed));
        }

        return [.. defenders.Where(g => g.Ships.Values.Sum() > 0)];
    }

    // The best defense level any player has on the planet: every defending ship may reroll a miss that many times.
    private static int DefenseRerolls(GameState state, PlanetId planet) =>
        state.Players.Select(p => p.HoldingAt(planet)?.DefenseLevel ?? 0).DefaultIfEmpty(0).Max();
}
