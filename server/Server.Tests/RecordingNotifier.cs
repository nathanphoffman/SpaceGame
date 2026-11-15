using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

/// <summary>Stands in for the SignalR hub and remembers what was sent.</summary>
public sealed class RecordingNotifier : IGameNotifier
{
    public List<string> GameEndedOutcomes { get; } = [];

    public Task StateChangedAsync(Guid gameId, long version) => Task.CompletedTask;

    public Task FleetSpottedAsync(Guid gameId, string fleetId, string targetPlanetId, long arrivesAtGameTime, string strengthHint) => Task.CompletedTask;

    public Task BattleResolvedAsync(Guid gameId, string reportId) => Task.CompletedTask;

    public Task GameEndedAsync(Guid gameId, string outcome)
    {
        GameEndedOutcomes.Add(outcome);

        return Task.CompletedTask;
    }
}
