namespace SpaceGame.Server.Game;

/// <summary>Event kind strings the engine emits; the server reacts to these.</summary>
public static class EventKinds
{
    public const string BattleResolved = "BattleResolved";
    public const string GameEnded = "GameEnded";
    public const string FleetSpotted = "FleetSpotted";
}

/// <summary>Values of the stored game status column.</summary>
public static class GameStatus
{
    public const string Lobby = "lobby";
    public const string Running = "running";
    public const string Finished = "finished";
}
