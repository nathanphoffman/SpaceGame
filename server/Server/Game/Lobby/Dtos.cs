namespace SpaceGame.Server.Lobby;

public sealed record CreateGameRequest(string? Name, string? Mode, int? Seed, string? DiscordWebhookUrl);
public sealed record CreateGameResponse(Guid GameId, string Code, Guid PlayerId, string PlayerToken);
public sealed record JoinGameRequest(string? Code, string? PlayerName);
public sealed record JoinGameResponse(Guid GameId, Guid PlayerId, string PlayerToken);
public sealed record LobbyPlayer(Guid Id, string Name, bool IsHost);
public sealed record LobbyResponse(string Code, string Mode, bool Started, IReadOnlyList<LobbyPlayer> Players);

/// <summary>Success with a value, or a failure with an HTTP status and a short sentence.</summary>
public sealed record ServiceResult<T>(T? Value, int Status, string? Error)
{
    public bool Ok => Error is null;

    public static ServiceResult<T> Success(T value) => new(value, StatusCodes.Status200OK, null);

    public static ServiceResult<T> Fail(int status, string error) => new(default, status, error);
}
