namespace SpaceGame.Core;

/// <summary>
/// The whole game: galaxy, planets, holdings, fleets, queues, stockpiles, upgrades, enemy memory, scores, outcome.
/// Everything inside must round-trip through System.Text.Json (the server stores it as JSONB).
/// </summary>
/// <param name="Time">Game seconds since the start that this state is advanced to.</param>
public sealed record GameState(GameConfig Config, long Time);
