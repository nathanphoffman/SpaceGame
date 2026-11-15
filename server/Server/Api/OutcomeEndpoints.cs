using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Api;

/// <summary>The final result of a finished game.</summary>
public static class OutcomeEndpoints
{
    public static void MapOutcomeEndpoints(this RouteGroupBuilder game) =>
        game.MapGet("/outcome", GetOutcome).RequireAuthorization().WithName("GetOutcome").Produces<GameOutcome>();

    private static async Task<IResult> GetOutcome(string gameId, HttpContext http, GameRepository repo, ILogger<GameOutcome> log)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var id, out _);

        if (denied is not null)
        {
            return denied;
        }

        var row = await repo.OutcomeAsync(id);

        return row is null
            ? Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: "The game has not ended yet.")
            : Results.Ok(OutcomeRecorder.Parse(row, log));
    }
}
