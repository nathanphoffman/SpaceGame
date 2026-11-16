using Microsoft.Extensions.Logging;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class GameOutcomeTests
{
    private sealed class CapturingLogger : ILogger
    {
        public List<LogLevel> Levels { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Levels.Add(logLevel);
    }

    [Fact]
    public void Unreadable_payload_gives_unknown_outcome_and_logs_a_warning()
    {
        var log = new CapturingLogger();
        var row = new ReportRow { Id = Guid.NewGuid(), GameId = Guid.NewGuid(), Kind = OutcomeRecorder.OutcomeKind, Payload = "not json" };

        var outcome = OutcomeRecorder.Parse(row, log);

        Assert.Equal((OutcomeRecorder.Unknown, OutcomeRecorder.Unknown, 0, 0), (outcome.Winner, outcome.Reason, outcome.TeamScore, outcome.EnemyScore));
        Assert.Equal([LogLevel.Warning], log.Levels);
    }

    [Fact]
    public void Bad_contributions_give_an_empty_table_and_log_a_warning()
    {
        var log = new CapturingLogger();
        var data = new Dictionary<string, string> { ["winner"] = "team", ["contributions"] = "{broken" };

        var row = OutcomeRecorder.RowFor(Guid.NewGuid(), [new GameEvent(5, OutcomeRecorder.OutcomeKind, data)], log);
        var outcome = OutcomeRecorder.Parse(row!, log);

        Assert.Equal("team", outcome.Winner);
        Assert.Empty(outcome.Contributions);
        Assert.Equal([LogLevel.Warning], log.Levels);
    }
}
