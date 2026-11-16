namespace SpaceGame.Core;

/// <summary>The enemy's tunable numbers. Money is "points": a ship costs the total of its resource cost.</summary>
/// <param name="TickSeconds">How often the enemy earns income and makes decisions.</param>
/// <param name="IncomePerPlanetPerTick">Hidden income for every planet the enemy owns.</param>
/// <param name="HomeGarrisonFighters">Fighters the enemy keeps at its home world; spending refills this first.</param>
/// <param name="EscortFighters">Fighters sent along with each Colony ship.</param>
/// <param name="AttackStrengthRatio">An attack goes out only when the fleet is at least this many times as strong as the target's defenders.</param>
/// <param name="SightHops">How many star hops around its planets the enemy can see player planets.</param>
/// <param name="FirstEarthAttackSeconds">Earliest game second of the first Earth attack (hour 36).</param>
/// <param name="EarthAttackIntervalSeconds">Time between Earth attacks (about 18 hours).</param>
/// <param name="FirstEarthAttackFighters">Fighters in the first Earth attack with one player.</param>
/// <param name="EarthAttackGrowth">Each Earth attack fleet is this many times the last.</param>
/// <param name="EarthAttackPerExtraPlayer">Extra size per player beyond the first (0.25 is +25%).</param>
public sealed record EnemyConfig(
    long TickSeconds = GameSeconds.Hour,
    int IncomePerPlanetPerTick = EnemyConfig.DefaultIncome,
    int HomeGarrisonFighters = EnemyConfig.DefaultGarrison,
    int EscortFighters = EnemyConfig.DefaultEscort,
    double AttackStrengthRatio = EnemyConfig.DefaultStrengthRatio,
    int SightHops = EnemyConfig.DefaultSightHops,
    long FirstEarthAttackSeconds = EnemyConfig.FirstAttackHours * GameSeconds.Hour,
    long EarthAttackIntervalSeconds = EnemyConfig.AttackIntervalHours * GameSeconds.Hour,
    int FirstEarthAttackFighters = EnemyConfig.DefaultFirstAttackFighters,
    double EarthAttackGrowth = EnemyConfig.DefaultAttackGrowth,
    double EarthAttackPerExtraPlayer = EnemyConfig.DefaultPerExtraPlayer)
{
    public const int FirstAttackHours = 36;
    internal const int DefaultIncome = 40;
    internal const int DefaultGarrison = 10;
    internal const int DefaultEscort = 4;
    internal const double DefaultStrengthRatio = 1.5;
    internal const int DefaultSightHops = 2;
    internal const int DefaultFirstAttackFighters = 6;
    internal const double DefaultAttackGrowth = 1.35;
    internal const double DefaultPerExtraPlayer = 0.25;
    public const int AttackIntervalHours = 18;

    /// <summary>The enemy's id as the owner of its fleets.</summary>
    public static readonly PlayerId Owner = new("enemy");
}
