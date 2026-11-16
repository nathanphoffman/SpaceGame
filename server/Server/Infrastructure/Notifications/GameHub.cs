using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Hubs;

/// <summary>Server-to-client only. A player joins the group of the game their token belongs to.</summary>
[Authorize(AuthenticationSchemes = PlayerAuth.Scheme)]
public sealed class GameHub : Hub
{
    public static string Group(Guid gameId) => gameId.ToString();

    public override async Task OnConnectedAsync()
    {
        var player = PlayerIdentity.From(Context.User!);
        var requested = Context.GetHttpContext()?.Request.Query["gameId"].ToString();

        if (player is null || requested != player.GameId.ToString())
        {
            Context.Abort();

            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, Group(player.GameId));
        await base.OnConnectedAsync();
    }
}

/// <summary>Names of the messages the hub sends to clients.</summary>
public static class ClientEvents
{
    public const string StateChanged = "StateChanged";
    public const string FleetSpotted = "FleetSpotted";
    public const string BattleResolved = "BattleResolved";
    public const string GameEnded = "GameEnded";
}

public sealed class SignalRGameNotifier(IHubContext<GameHub> hub) : IGameNotifier
{
    public Task StateChangedAsync(Guid gameId, long version) =>
        hub.Clients.Group(GameHub.Group(gameId)).SendAsync(ClientEvents.StateChanged, version);

    public Task FleetSpottedAsync(Guid gameId, string fleetId, string targetPlanetId, long arrivesAtGameTime, string strengthHint) =>
        hub.Clients.Group(GameHub.Group(gameId)).SendAsync(ClientEvents.FleetSpotted, fleetId, targetPlanetId, arrivesAtGameTime, strengthHint);

    public Task BattleResolvedAsync(Guid gameId, string reportId) =>
        hub.Clients.Group(GameHub.Group(gameId)).SendAsync(ClientEvents.BattleResolved, reportId);

    public Task GameEndedAsync(Guid gameId, string outcome) =>
        hub.Clients.Group(GameHub.Group(gameId)).SendAsync(ClientEvents.GameEnded, outcome);
}
