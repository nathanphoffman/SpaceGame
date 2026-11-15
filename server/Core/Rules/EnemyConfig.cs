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
    int IncomePerPlanetPerTick = 40,
    int HomeGarrisonFighters = 10,
    int EscortFighters = 4,
    double AttackStrengthRatio = 1.5,
    int SightHops = 2,
    long FirstEarthAttackSeconds = 36 * GameSeconds.Hour,
    long EarthAttackIntervalSeconds = 18 * GameSeconds.Hour,
    int FirstEarthAttackFighters = 6,
    double EarthAttackGrowth = 1.35,
    double EarthAttackPerExtraPlayer = 0.25)
{
    /// <summary>The enemy's id as the owner of its fleets.</summary>
    public static readonly PlayerId Owner = new("enemy");
}
