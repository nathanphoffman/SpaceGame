namespace SpaceGame.Core;

/// <summary>Applies StartUpgrade, finishes research and turns upgrade levels into ship stats.</summary>
public static class Upgrades
{
    private static readonly CommandResult Ok = new(true, null);

    /// <summary>Starts researching the next level of an upgrade; the cost is taken up front.</summary>
    public static (GameState State, CommandResult Result) BeginResearch(GameState state, PlayerId playerId, StartUpgrade cmd, long nowSeconds)
    {
        var player = state.PlayerById(playerId);

        if (player is null) return Fail(state, "You are not in this game.");
        var spec = state.Config.Catalog.Upgrade(cmd.Type);
        var level = player.UpgradeLevel(cmd.Type) + 1;
        var stock = player.Stock.AdvanceTo(nowSeconds, Economy.RatePerHourMilli(state, player));
        var cost = spec.CostAtLevel(level);
        var problem = Problem(player, spec, level, stock, cost);

        if (problem is not null) return Fail(state, problem);
        var job = new ResearchJob(cmd.Type, level, nowSeconds + spec.BuildSeconds, cost);

        return (state.WithPlayer(player with { Stock = stock.Spend(cost), Research = job }), Ok);
    }

    /// <summary>Records a finished research job and clears it.</summary>
    public static PlayerState FinishResearch(PlayerState player, GameState state, ResearchJob job, List<GameEvent> events)
    {
        var stock = player.Stock.AdvanceTo(job.FinishAt, Economy.RatePerHourMilli(state, player));
        var levels = player.Upgrades.ToDictionary(pair => pair.Key, pair => pair.Value);
        levels[job.Type] = job.Level;
        events.Add(new GameEvent(job.FinishAt, "UpgradeCompleted", new Dictionary<string, string>
        {
            [EventKeys.Player] = player.Id.Value,
            ["what"] = job.Type.ToString(),
            ["level"] = job.Level.ToString(),
        }));

        return player with { Stock = stock, Upgrades = levels, Research = null };
    }

    /// <summary>A ship's battle stats with the player's Weapons and Armor upgrades applied.</summary>
    public static BattleShip BattleShipFor(Catalog catalog, PlayerState player, ShipType type)
    {
        var spec = catalog.Ship(type);
        var weapons = player.UpgradeLevel(UpgradeType.Weapons);
        var armor = player.UpgradeLevel(UpgradeType.Armor);
        var armed = spec.HitsOn > 0;
        var hitsOn = armed ? Math.Max(2, spec.HitsOn - weapons * (int)catalog.Upgrade(UpgradeType.Weapons).BonusPerLevel) : 0;
        var plated = type is ShipType.Fighter or ShipType.Battleship;
        var hp = spec.Hp + (plated ? armor * (int)catalog.Upgrade(UpgradeType.Armor).BonusPerLevel : 0);

        return new BattleShip(type, hitsOn, spec.Shots, hp);
    }

    /// <summary>Speed of a fleet of this player (slowest ship, Engines applied).</summary>
    public static double FleetSpeed(Catalog catalog, PlayerState player, IReadOnlyDictionary<ShipType, int> ships) =>
        TravelRules.FleetSpeed(catalog, ships, player.UpgradeLevel(UpgradeType.Engines));

    // Returns why the upgrade cannot start, or null when it can.
    private static string? Problem(PlayerState player, UpgradeSpec spec, int level, Stockpile stock, Resources cost)
    {
        if (player.Research is not null) return "Another upgrade is already being researched.";

        if (level > spec.MaxLevel) return $"{spec.Type} is already at its top level.";

        return stock.Amount.Covers(cost) ? null : "Not enough resources.";
    }

    private static (GameState, CommandResult) Fail(GameState state, string error) => (state, new CommandResult(false, error));
}
