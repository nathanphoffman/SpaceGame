using SpaceGame.Core;
using SpaceGame.Server.Game;

namespace SpaceGame.Server.Tests;

public class ReportRecorderTests
{
    private static GameEvent Battle(long time) =>
        new(time, "BattleResolved", new Dictionary<string, string> { ["planet"] = "p9", ["attackersWon"] = "true", ["rounds"] = "4" });

    [Fact]
    public void Only_battle_events_become_rows()
    {
        var events = new[] { new GameEvent(1, "ScoreChanged", new Dictionary<string, string>()), Battle(50) };
        var rows = ReportRecorder.RowsFor(Guid.NewGuid(), events);
        Assert.Single(rows);
        Assert.Equal(50, rows[0].GameTime);
    }

    [Fact]
    public void The_payload_parses_back_to_a_report_with_the_row_id()
    {
        var reportRow = ReportRecorder.RowsFor(Guid.NewGuid(), [Battle(50)])[0];
        var report = ReportRecorder.Parse(reportRow)!;
        Assert.Equal(reportRow.Id.ToString(), report.Id);
        Assert.Equal(new PlanetId("p9"), report.Planet);
        Assert.True(report.AttackersWon);
        Assert.Equal(4, report.Rounds);
    }

    [Fact]
    public void Missing_data_gives_defaults()
    {
        var reportRow = ReportRecorder.RowsFor(Guid.NewGuid(), [new GameEvent(5, "BattleResolved", new Dictionary<string, string>())])[0];
        var report = ReportRecorder.Parse(reportRow)!;
        Assert.False(report.AttackersWon);
        Assert.Equal(0, report.Rounds);
    }
}
