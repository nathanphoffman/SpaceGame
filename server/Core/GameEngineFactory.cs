namespace SpaceGame.Core;

/// <summary>Creates the engine.</summary>
public static class GameEngineFactory
{
    /// <summary>Returns the engine.</summary>
    public static IGameEngine Create() => new GameEngine();
}
