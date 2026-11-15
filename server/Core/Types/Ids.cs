namespace SpaceGame.Core;

/// <summary>Identifies a player.</summary>
public readonly record struct PlayerId(string Value);

/// <summary>Identifies a planet.</summary>
public readonly record struct PlanetId(string Value);

/// <summary>Identifies a star system.</summary>
public readonly record struct SystemId(string Value);

/// <summary>Identifies a fleet.</summary>
public readonly record struct FleetId(string Value);
