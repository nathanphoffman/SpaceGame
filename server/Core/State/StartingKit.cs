namespace SpaceGame.Core;

/// <summary>What every player owns at the start of the game (SPEC.md "Start of the game").</summary>
public static class StartingKit
{
    /// <summary>The planet every player starts on.</summary>
    public static readonly PlanetId EarthId = StarCatalog.Earth.Id;

    private const int StartIron = 300;
    private const int StartHydrogen = 100;
    private const int StartTitanium = 50;
    private const int StartFighters = 4;

    /// <summary>The starting stockpile.</summary>
    public static readonly Resources Stock = new(StartIron, StartHydrogen, StartTitanium, 0);

    /// <summary>A new player's Earth holding: Iron mine level 1, a shipyard and the first ships.</summary>
    public static Holding EarthHolding() => new(EarthId)
    {
        Mines = new Dictionary<Element, int> { [Element.Iron] = 1 },
        HasShipyard = true,
        Ships = new Dictionary<ShipType, int>
        {
            [ShipType.Fighter] = StartFighters,
            [ShipType.Scout] = 1,
            [ShipType.Colony] = 1,
        },
    };

    /// <summary>A new player's state at time 0.</summary>
    public static PlayerState Player(PlayerId playerId) => new(playerId, Stockpile.Open(Stock, 0), [EarthHolding()]);
}
