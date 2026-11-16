namespace SpaceGame.Server.Game;

/// <summary>Tells connected players that something changed. The SignalR version lives in Hubs; tests use a fake.</summary>
public interface IGameNotifier
{
    Task StateChangedAsync(Guid gameId, long version);

    Task FleetSpottedAsync(Guid gameId, string fleetId, string targetPlanetId, long arrivesAtGameTime, string strengthHint);

    Task BattleResolvedAsync(Guid gameId, string reportId);

    Task GameEndedAsync(Guid gameId, string outcome);
}

/// <summary>Does nothing; used when nobody listens.</summary>
public sealed class NullGameNotifier : IGameNotifier
{
    public Task StateChangedAsync(Guid gameId, long version) => Task.CompletedTask;

    public Task FleetSpottedAsync(Guid gameId, string fleetId, string targetPlanetId, long arrivesAtGameTime, string strengthHint) => Task.CompletedTask;

    public Task BattleResolvedAsync(Guid gameId, string reportId) => Task.CompletedTask;

    public Task GameEndedAsync(Guid gameId, string outcome) => Task.CompletedTask;
}
