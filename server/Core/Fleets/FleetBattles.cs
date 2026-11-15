namespace SpaceGame.Core;

/// <summary>Ships that defend a planet: a parked fleet, or the ships of a player's base.</summary>
internal sealed record Garrison(
    Fleet? Fleet, PlayerId? BaseOwner, IReadOnlyDictionary<ShipType, int> Ships, IReadOnlyDictionary<ShipType, int> Damage)
{
    public PlayerId Owner => Fleet?.Owner ?? BaseOwner!.Value;
}

/// <summary>Fights the battle when a fleet arrives at a planet that the other side holds ships on.</summary>
internal static class FleetBattles
{
    private static Side Opposite(Side side) => side == Side.Team ? Side.Enemy : Side.Team;

    /// <summary>True when ships of the other side wait at the fleet's destination.</summary>
    public static bool HasDefenders(GameState state, Fleet attacker) => Defenders(state, attacker).Count > 0;

    /// <summary>
    /// Resolves the battle (the attacker is already removed from the state). Survivors of both sides stay;
    /// an attacker with ships left lands as usual.
    /// </summary>
    public static GameState Fight(GameState state, Fleet attacker, List<GameEvent> events, IDice dice)
    {
        var planet = attacker.To;
        var defenders = Defenders(state, attacker);
        var defenderSide = Opposite(attacker.Side);
        var attackSide = new BattleSide(ShipsOf(state, attacker.Owner, attacker.Side, attacker.Ships, attacker.Damage));
        var defendSide = new BattleSide([.. defenders.SelectMany(g => ShipsOf(state, g.Owner, defenderSide, g.Ships, g.Damage))]);
        var bonus = attacker.Side == Side.Enemy && HasDefenseBuilding(state, planet) ? state.Config.DefenseBonus : 0;
        var result = BattleResolver.Resolve(attackSide, defendSide, bonus, dice);

        events.Add(ReportEvent(attacker, attackSide, defendSide, result));
        var after = Survive(state, planet, defenders, result.Defenders, defenderSide, attacker.ArriveAt);
        var left = Count(result.Attackers);
        var hurt = ShipDamage.Tally(result.Attackers, type => FullHp(state, attacker.Owner, attacker.Side, type));

        return left.Count == 0
            ? after
            : FleetArrivals.Land(after, attacker with { Ships = left, Damage = hurt }, planet, attacker.ArriveAt, events);
    }

    private static List<Garrison> Defenders(GameState state, Fleet attacker)
    {
        var planet = attacker.To;
        var defenders = state.Fleets
            .Where(f => f.Parked && f.To == planet && f.Side == Opposite(attacker.Side))
            .Select(f => new Garrison(f, null, f.Ships, f.Damage)).ToList();

        if (attacker.Side != Side.Enemy) return defenders;

        // Pair every player with their holding here, then keep only players who actually have one.
        var bases = state.Players.Select(p => (p.Id, Holding: p.HoldingAt(planet))).Where(x => x.Holding is not null);

        defenders.AddRange(bases.Select(x => BaseGarrison(state, x.Id, x.Holding!, attacker.ArriveAt)));

        return [.. defenders.Where(g => g.Ships.Values.Sum() > 0)];
    }

    private static Garrison BaseGarrison(GameState state, PlayerId owner, Holding holding, long nowSeconds)
    {
        var healed = ShipDamage.Healed(state.Config, holding, type => FullHp(state, owner, Side.Team, type), nowSeconds);

        return new Garrison(null, owner, holding.Ships, healed);
    }

    // True when any player has a defense building on the planet.
    private static bool HasDefenseBuilding(GameState state, PlanetId planet) =>
        state.Players.Any(p => p.HoldingAt(planet)?.HasDefense == true);

    private static List<BattleShip> ShipsOf(
        GameState state, PlayerId owner, Side side, IReadOnlyDictionary<ShipType, int> ships, IReadOnlyDictionary<ShipType, int> damage)
    {
        var player = state.PlayerById(owner);

        // Sorted by type so ships expand in a stable order; each type becomes one ship per count, carrying its damage.
        return [.. ships.OrderBy(s => s.Key).SelectMany(s =>
            ShipDamage.Expand(StatsOf(state, player, side, s.Key), s.Value, damage.GetValueOrDefault(s.Key)))];
    }

    private static int FullHp(GameState state, PlayerId owner, Side side, ShipType type) =>
        StatsOf(state, state.PlayerById(owner), side, type).Hp;

    private static BattleShip StatsOf(GameState state, PlayerState? player, Side side, ShipType type)
    {
        if (side == Side.Team && player is not null) return Upgrades.BattleShipFor(state.Config.Catalog, player, type);
        var spec = state.Config.Catalog.Ship(type);

        return new BattleShip(type, spec.HitsOn, spec.Shots, spec.Hp);
    }

    // Counts the surviving ships of each type.
    private static Dictionary<ShipType, int> Count(BattleSide side) =>
        side.Ships.GroupBy(s => s.Type).ToDictionary(g => g.Key, g => g.Count());

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

    // Sorted by type so the same fleet always prints the same text.
    private static string Join(IReadOnlyDictionary<ShipType, int> ships) =>
        string.Join(",", ships.OrderBy(s => s.Key).Select(s => $"{s.Value} {s.Key}"));

    private static GameEvent ReportEvent(Fleet attacker, BattleSide attackSide, BattleSide defendSide, BattleResult result) =>
        new(attacker.ArriveAt, "BattleResolved", new Dictionary<string, string>
        {
            ["planet"] = attacker.To.Value,
            ["fleet"] = attacker.Id.Value,
            ["attackerSide"] = attacker.Side.ToString(),
            ["attackersWon"] = result.AttackersWon ? "true" : "false",
            ["rounds"] = result.Rounds.ToString(),
            ["attackers"] = Join(Count(attackSide)),
            ["defenders"] = Join(Count(defendSide)),
            ["attackersLeft"] = Join(Count(result.Attackers)),
            ["defendersLeft"] = Join(Count(result.Defenders)),
        });
}
