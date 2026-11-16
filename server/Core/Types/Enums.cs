namespace SpaceGame.Core;

/// <summary>The four resources.</summary>
public enum Element { Iron, Hydrogen, Titanium, Helium3 }

/// <summary>The six ship classes.</summary>
public enum ShipType { Scout, Hauler, Colony, Fighter, Battleship, Dreadnought }

/// <summary>Things a planet builds or upgrades. A Mine is built per <see cref="Element"/>; Shipyard, Defense and Mining have a level that can keep growing.</summary>
public enum BuildingType { Mine, Shipyard, Defense, Mining }

/// <summary>The two sides of the game: all players together, and the enemy AI.</summary>
[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum Side { Team, Enemy }
