namespace SpaceGame.Core;

/// <summary>The public API of Core. The server depends only on this.</summary>
public interface IGameEngine
{
    /// <summary>Creates a new game from a setup (deterministic from the seed).</summary>
    GameState NewGame(GameSetup setup);

    /// <summary>Moves the game forward to <paramref name="nowSeconds"/>, resolving everything due in time order. Pure and deterministic given the dice.</summary>
    (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long nowSeconds, IDice dice);

    /// <summary>Validates and applies one player command.</summary>
    (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long nowSeconds);

    /// <summary>The state as one player may see it.</summary>
    PlayerView ViewFor(GameState state, PlayerId player, long nowSeconds);

    /// <summary>Public map data.</summary>
    GalaxyMap Map(GameState state);

    /// <summary>The trip timer for a send order.</summary>
    FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long nowSeconds);
}
