namespace SpaceGame.Server.Api;

/// <summary>
/// Routes from CONTRACTS.md. Each one answers 501 until its own task fills it in,
/// so the OpenAPI document already lists the whole API.
/// </summary>
public static class GameEndpoints
{
    public static void MapGameEndpoints(this WebApplication app)
    {
        var games = app.MapGroup("/api/games");
        games.MapLobbyEndpoints();

        var game = games.MapGroup("/{gameId}");
        game.MapPlayEndpoints();
        game.MapGet("/reports", (string gameId) => NotImplemented()).WithName("ListReports");
        game.MapGet("/reports/{id}", (string gameId, string id) => NotImplemented()).WithName("GetReport");
    }

    private static IResult NotImplemented() =>
        Results.Problem(statusCode: StatusCodes.Status501NotImplemented, title: "Not implemented yet");
}
