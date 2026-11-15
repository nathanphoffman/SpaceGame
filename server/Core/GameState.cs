namespace SpaceGame.Core;

/// <summary>
/// The whole game: galaxy, planets, holdings, fleets, queues, stockpiles, upgrades, enemy memory, scores, outcome.
/// Everything inside must round-trip through System.Text.Json (the server stores it as JSONB).
/// </summary>
/// <param name="Time">Game seconds since the start that this state is advanced to.</param>
public sealed record GameState(GameConfig Config, long Time)
{
    /// <summary>Planet compositions.</summary>
    public IReadOnlyList<PlanetData> Planets { get; init; } = [];

    /// <summary>Every player's stockpile and bases.</summary>
    public IReadOnlyList<PlayerState> Players { get; init; } = [];

    /// <summary>The player with this id, if in the game.</summary>
    public PlayerState? PlayerById(PlayerId playerId) => Players.FirstOrDefault(known => known.Id == playerId);

    /// <summary>A copy with one player replaced.</summary>
    public GameState WithPlayer(PlayerState player) =>
        this with { Players = [.. Players.Select(existing => existing.Id == player.Id ? player : existing)] };

    /// <summary>A planet's composition, if known.</summary>
    public PlanetData? PlanetById(PlanetId planetId) => Planets.FirstOrDefault(known => known.Id == planetId);
}
