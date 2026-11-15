namespace SpaceGame.Core;

/// <summary>The four resources.</summary>
public enum Element { Iron, Hydrogen, Titanium, Helium3 }

/// <summary>The six ship classes.</summary>
public enum ShipType { Scout, Hauler, Colony, Fighter, Battleship, Dreadnought }

/// <summary>Buildings on a planet. A Mine is built per <see cref="Element"/>.</summary>
public enum BuildingType { Mine, Shipyard, Defense }

/// <summary>The four per-player upgrades.</summary>
public enum UpgradeType { Engines, Weapons, Armor, Mining }

/// <summary>The two sides of the game: all players together, and the enemy AI.</summary>
[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum Side { Team, Enemy }
