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
        game.MapReportEndpoints();
        game.MapOutcomeEndpoints();
    }
}
