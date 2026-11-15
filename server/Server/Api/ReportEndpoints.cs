using SpaceGame.Server.Game;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Api;

/// <summary>Battle reports of a game, read from the reports table.</summary>
public static class ReportEndpoints
{
    public static void MapReportEndpoints(this RouteGroupBuilder game)
    {
        game.MapGet("/reports", ListReports).RequireAuthorization().WithName("ListReports").Produces<List<Core.BattleReport>>();
        game.MapGet("/reports/{id}", GetReport).RequireAuthorization().WithName("GetReport").Produces<Core.BattleReport>();
    }

    private static async Task<IResult> ListReports(string gameId, HttpContext http, GameRepository repo)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var id, out _);

        if (denied is not null)
        {
            return denied;
        }

        var rows = await repo.ReportsAsync(id);

        return Results.Ok(rows.Select(ReportRecorder.Parse).OfType<Core.BattleReport>().ToList());
    }

    private static async Task<IResult> GetReport(string gameId, string id, HttpContext http, GameRepository repo)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var gameGuid, out _);

        if (denied is not null)
        {
            return denied;
        }

        var row = Guid.TryParse(id, out var reportId) ? await repo.ReportAsync(gameGuid, reportId) : null;

        return row is null
            ? Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: "Report not found.")
            : Results.Ok(ReportRecorder.Parse(row));
    }
}
