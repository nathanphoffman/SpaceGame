using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class EventNotificationsTests
{
    private sealed class RecordingNotifier : IGameNotifier
    {
        public List<string> Calls { get; } = [];

        public Task StateChangedAsync(Guid gameId, long version) => Add($"state:{version}");

        public Task FleetSpottedAsync(Guid gameId, string fleetId, string targetPlanetId, long arrivesAtGameTime, string strengthHint) =>
            Add($"spotted:{fleetId}:{targetPlanetId}:{arrivesAtGameTime}:{strengthHint}");

        public Task BattleResolvedAsync(Guid gameId, string reportId) => Add($"battle:{reportId}");

        public Task GameEndedAsync(Guid gameId, string outcome) => Add($"ended:{outcome}");

        private Task Add(string call)
        {
            Calls.Add(call);

            return Task.CompletedTask;
        }
    }

    private static GameEvent Event(string kind, params (string Key, string Value)[] data) =>
        new(1, kind, data.ToDictionary(d => d.Key, d => d.Value));

    [Fact]
    public async Task Always_sends_state_changed_with_the_version()
    {
        var notifier = new RecordingNotifier();
        await EventNotifications.PublishAsync(notifier, Guid.NewGuid(), 7, [], []);
        Assert.Equal(["state:7"], notifier.Calls);
    }

    [Fact]
    public async Task Maps_each_event_kind_to_its_message()
    {
        var notifier = new RecordingNotifier();
        var report = new ReportRow { Id = Guid.NewGuid() };
        GameEvent[] events =
        [
            Event("FleetSpotted", ("fleet", "f1"), ("planet", "p2"), ("arrivesAt", "900"), ("strength", "large")),
            Event("GameEnded", ("outcome", "won")),
            Event("ScoreChanged"),
        ];

        await EventNotifications.PublishAsync(notifier, Guid.NewGuid(), 2, events, [report]);
        Assert.Equal(["state:2", $"battle:{report.Id}", "spotted:f1:p2:900:large", "ended:won"], notifier.Calls);
    }
}
