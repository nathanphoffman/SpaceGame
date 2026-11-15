namespace SpaceGame.Core;

/// <summary>
/// A group of ships on the move (or parked after arriving somewhere it has no base). Times are game seconds.
/// A recalled fleet flies back with <paramref name="Returning"/> set.
/// </summary>
/// <param name="LaunchAt">When it was ordered.</param>
/// <param name="DepartAt">End of the prep; it moves after this.</param>
/// <param name="Parked">True once it has arrived at a planet where its owner has no base (battles come later).</param>
public sealed record Fleet(
    FleetId Id, PlayerId Owner, PlanetId From, PlanetId To,
    long LaunchAt, long DepartAt, long ArriveAt,
    IReadOnlyDictionary<ShipType, int> Ships, Resources Cargo, bool Returning = false, bool Parked = false)
{
    /// <summary>The map record of this fleet.</summary>
    public FleetView ToView() => new(Id, Owner, Side.Team, From, To, LaunchAt, DepartAt, ArriveAt, Ships, Cargo);
}
