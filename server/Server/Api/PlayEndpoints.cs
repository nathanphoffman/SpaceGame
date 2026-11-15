using SpaceGame.Core;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Api;

/// <summary>Body of a quote request: a send-fleet order.</summary>
public sealed record SendFleetBody(string? From, Dictionary<ShipType, int>? Ships, string? To, Resources? Cargo)
{
    public SendFleet? ToCommand() =>
        string.IsNullOrWhiteSpace(From) || string.IsNullOrWhiteSpace(To) || Ships is null
            ? null
            : new SendFleet(new PlanetId(From), Ships, new PlanetId(To), Cargo);
}

/// <summary>Map, state and quote: read-only calls on top of the game session.</summary>
public static class PlayEndpoints
{
    public static void MapPlayEndpoints(this RouteGroupBuilder game)
    {
        game.MapGet("/map", GetMap).WithName("GetMap").Produces<GalaxyMap>();
        game.MapGet("/state", GetState).RequireAuthorization().WithName("GetState").Produces<PlayerView>();
        game.MapPost("/commands", PostCommand).RequireAuthorization().WithName("PostCommand").Produces<CommandResult>();
        game.MapPost("/quote", PostQuote).RequireAuthorization().WithName("PostQuote").Produces<FlightQuote>();
    }

    private static async Task<IResult> GetMap(string gameId, GameRepository repo, IGameEngine engine)
    {
        if (!Guid.TryParse(gameId, out var id) || await repo.LoadAsync(id) is not { } game)
        {
            return NotFound();
        }

        return Results.Ok(engine.Map(game.State));
    }

    private static async Task<IResult> GetState(string gameId, HttpContext http, GameSession session, IGameEngine engine)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var id, out var caller);

        if (denied is not null)
        {
            return denied;
        }

        var snap = await session.AdvanceAsync(id);

        return snap is null
            ? NotFound()
            : Results.Ok(engine.ViewFor(snap.Game.State, PlayerOf(caller!), snap.GameTime) with { Version = snap.Game.Version });
    }

    private static async Task<IResult> PostQuote(string gameId, SendFleetBody? body, HttpContext http, GameSession session, IGameEngine engine)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var id, out var caller);

        if (denied is not null)
        {
            return denied;
        }

        var send = body?.ToCommand();

        if (send is null)
        {
            return Results.Problem(statusCode: StatusCodes.Status400BadRequest, detail: "A quote needs from, to and ships.");
        }

        var snap = await session.AdvanceAsync(id);

        return snap is null ? NotFound() : Results.Ok(engine.Quote(snap.Game.State, PlayerOf(caller!), send, snap.GameTime));
    }

    private static async Task<IResult> PostCommand(string gameId, CommandBody? body, HttpContext http, GameSession session, IGameEngine engine)
    {
        var denied = LobbyEndpoints.Authorize(gameId, http, out var id, out var caller);

        if (denied is not null)
        {
            return denied;
        }

        var parsed = CommandParser.Parse(body);

        if (parsed.Command is null)
        {
            return Results.Problem(statusCode: StatusCodes.Status400BadRequest, detail: parsed.Error);
        }

        var result = new CommandResult(false, Lobby.LobbyService.GameNotFound);
        var snap = await session.MutateAsync<CommandResult>(id, (state, now) =>
        {
            var (newState, outcome) = engine.Apply(state, PlayerOf(caller!), parsed.Command, now);
            result = outcome;

            return (newState, outcome);
        });

        return snap is null ? NotFound() : Results.Ok(result);
    }

    private static PlayerId PlayerOf(PlayerIdentity caller) => new(caller.PlayerId.ToString());

    private static IResult NotFound() =>
        Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: Lobby.LobbyService.GameNotFound);
}
