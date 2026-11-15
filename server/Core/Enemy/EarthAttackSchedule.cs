namespace SpaceGame.Core;

/// <summary>When the enemy sends its scheduled attacks on Earth, and how big they are.</summary>
public static class EarthAttackSchedule
{
    /// <summary>Game second the attack with this index (0 for the first) is due.</summary>
    public static long DueAt(EnemyConfig config, int index) =>
        config.FirstEarthAttackSeconds + index * config.EarthAttackIntervalSeconds;

    /// <summary>Fighters in the attack with this index: grows each time and with every player after the first.</summary>
    public static int Fighters(EnemyConfig config, int index, int players)
    {
        var growth = Math.Pow(config.EarthAttackGrowth, index);
        var crowd = 1 + config.EarthAttackPerExtraPlayer * Math.Max(0, players - 1);

        return (int)Math.Round(config.FirstEarthAttackFighters * growth * crowd);
    }

    /// <summary>The attack to launch now, or null when none is due yet.</summary>
    public static LaunchEarthAttack? Due(GameState state, long nowSeconds)
    {
        var index = state.EarthAttacksSent;

        if (state.EnemyHome is null || nowSeconds < DueAt(state.Config.Enemy, index)) return null;

        return new LaunchEarthAttack(Fighters(state.Config.Enemy, index, state.Players.Count));
    }
}
