namespace SpaceGame.Core;

/// <summary>One thing the enemy decided to do this tick.</summary>
public abstract record EnemyOrder
{
    /// <summary>Points the order spends.</summary>
    public abstract int Cost(Catalog catalog);
}

/// <summary>Buys fighters that join the garrison at the home world.</summary>
public sealed record BuyGarrison(int Fighters) : EnemyOrder
{
    public override int Cost(Catalog catalog) => Fighters * catalog.Ship(ShipType.Fighter).Cost.Total;
}

/// <summary>Sends a new Colony ship with an escort from the home world to a planet.</summary>
public sealed record LaunchExpedition(PlanetId Target, int Escorts) : EnemyOrder
{
    public override int Cost(Catalog catalog) =>
        catalog.Ship(ShipType.Colony).Cost.Total + Escorts * catalog.Ship(ShipType.Fighter).Cost.Total;
}

/// <summary>A parked fleet with a Colony ship claims the planet it sits at.</summary>
public sealed record ClaimPlanet(FleetId Fleet) : EnemyOrder
{
    public override int Cost(Catalog catalog) => 0;
}

/// <summary>A parked enemy fleet leaves its planet to attack a player-held planet.</summary>
public sealed record LaunchAttack(FleetId Fleet, PlanetId Target) : EnemyOrder
{
    public override int Cost(Catalog catalog) => 0;
}

/// <summary>Sends a fresh fighter-only fleet from the home world to attack Earth on schedule.</summary>
public sealed record LaunchEarthAttack(int Fighters) : EnemyOrder
{
    public override int Cost(Catalog catalog) => 0;
}
