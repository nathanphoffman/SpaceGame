namespace SpaceGame.Core;

/// <summary>A player order. Applied with <see cref="IGameEngine.Apply"/>.</summary>
public abstract record GameCommand;

/// <summary>Build a building on a planet (Element is set for mines).</summary>
public sealed record BuildBuilding(PlanetId Planet, BuildingType Type, Element? Element) : GameCommand;

/// <summary>Queue ships at a planet's shipyard.</summary>
public sealed record QueueShip(PlanetId Planet, ShipType Type, int Count) : GameCommand;

/// <summary>Start researching an upgrade.</summary>
public sealed record StartUpgrade(UpgradeType Type) : GameCommand;

/// <summary>Send ships (and optional cargo for Haulers) from one planet to another.</summary>
public sealed record SendFleet(PlanetId From, IReadOnlyDictionary<ShipType, int> Ships, PlanetId To, Resources? Cargo) : GameCommand;

/// <summary>Turn a fleet in flight around; it returns to where it came from.</summary>
public sealed record RecallFleet(FleetId Fleet) : GameCommand;

/// <summary>Use one Colony ship of the player at that planet to claim it.</summary>
public sealed record Colonize(PlanetId Planet) : GameCommand;

/// <summary>Cancel a queued building or ship and refund it.</summary>
public sealed record CancelQueueItem(PlanetId Planet, string ItemId) : GameCommand;

/// <summary>Outcome of a command. Error is a short player-readable sentence.</summary>
public sealed record CommandResult(bool Ok, string? Error);

/// <summary>Something that happened: FleetSpotted, BattleResolved, PlanetCaptured, ScoreChanged, GameEnded ...</summary>
/// <param name="Time">Game seconds when it happened.</param>
/// <param name="Kind">The event name.</param>
/// <param name="Data">Free-form payload as text key/values.</param>
public sealed record GameEvent(long Time, string Kind, IReadOnlyDictionary<string, string> Data);
