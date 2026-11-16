using SpaceGame.Server.Auth;
using SpaceGame.Server.Lobby;

namespace SpaceGame.Server.Api;

/// <summary>Create, join, lobby and start.</summary>
public static class LobbyEndpoints
{
    public static void MapLobbyEndpoints(this RouteGroupBuilder games)
    {
        games.MapPost("/", async (CreateGameRequest req, LobbyService lobby) =>
            ToResult(await lobby.CreateAsync(req))).WithName("CreateGame").Produces<CreateGameResponse>();
        games.MapPost("/join", async (JoinGameRequest req, LobbyService lobby) =>
            ToResult(await lobby.JoinAsync(req))).WithName("JoinGame").Produces<JoinGameResponse>();
        games.MapGet("/{gameId}/lobby", GetLobby).RequireAuthorization().WithName("GetLobby").Produces<LobbyResponse>();
        games.MapPost("/{gameId}/start", Start).RequireAuthorization().WithName("StartGame");
    }

    private static async Task<IResult> GetLobby(string gameId, HttpContext http, LobbyService lobby) =>
        Authorize(gameId, http, out var id, out _) ?? ToResult(await lobby.LobbyAsync(id));

    private static async Task<IResult> Start(string gameId, HttpContext http, LobbyService lobby)
    {
        var denied = Authorize(gameId, http, out var id, out var caller);

        return denied ?? ToResult(await lobby.StartAsync(id, caller!));
    }

    /// <summary>Checks the route game id against the token's game. Returns an error result or null.</summary>
    public static IResult? Authorize(string gameId, HttpContext http, out Guid id, out PlayerIdentity? caller)
    {
        caller = PlayerIdentity.From(http.User);

        if (!Guid.TryParse(gameId, out id))
        {
            return Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: LobbyService.GameNotFound);
        }

        return caller?.GameId == id
            ? null
            : Results.Problem(statusCode: StatusCodes.Status403Forbidden, detail: "Your token is for a different game.");
    }

    private static IResult ToResult<T>(ServiceResult<T> result) =>
        result.Ok ? Results.Ok(result.Value) : Results.Problem(statusCode: result.Status, detail: result.Error);
}
