namespace SpaceGame.Core;

/// <summary>The enemy's tunable numbers. Money is "points": a ship costs the total of its resource cost.</summary>
/// <param name="TickSeconds">How often the enemy earns income and makes decisions.</param>
/// <param name="IncomePerPlanetPerTick">Hidden income for every planet the enemy owns.</param>
/// <param name="HomeGarrisonFighters">Fighters the enemy keeps at its home world; spending refills this first.</param>
/// <param name="EscortFighters">Fighters sent along with each Colony ship.</param>
public sealed record EnemyConfig(
    long TickSeconds = 3600,
    int IncomePerPlanetPerTick = 40,
    int HomeGarrisonFighters = 10,
    int EscortFighters = 4)
{
    /// <summary>The enemy's id as the owner of its fleets.</summary>
    public static readonly PlayerId Owner = new("enemy");
}
