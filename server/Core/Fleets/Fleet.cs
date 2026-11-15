namespace SpaceGame.Core;

/// <summary>
/// A group of ships on the move (or parked after arriving somewhere it has no base). Times are game seconds.
/// A recalled fleet flies back with <paramref name="Returning"/> set.
/// </summary>
/// <param name="LaunchAt">When it was ordered.</param>
/// <param name="DepartAt">End of the prep; it moves after this.</param>
/// <param name="Side">Team for player fleets, Enemy for the enemy's.</param>
/// <param name="Parked">True once it has arrived at a planet where its owner has no base (battles come later).</param>
public sealed record Fleet(
    FleetId Id, PlayerId Owner, PlanetId From, PlanetId To,
    long LaunchAt, long DepartAt, long ArriveAt,
    IReadOnlyDictionary<ShipType, int> Ships, Resources Cargo, bool Returning = false, bool Parked = false, Side Side = Side.Team)
{
    /// <summary>Hit points lost per ship type; they stay until the ships are repaired at a shipyard.</summary>
    public IReadOnlyDictionary<ShipType, int> Damage { get; init; } = new Dictionary<ShipType, int>();

    /// <summary>The map record of this fleet.</summary>
    public FleetView ToView() => new(Id, Owner, Side, From, To, LaunchAt, DepartAt, ArriveAt, Ships, Cargo) { SightHops = Visibility.SightHops(Ships) };
}
