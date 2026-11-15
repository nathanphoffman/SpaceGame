using SpaceGame.Sim;

namespace SpaceGame.Core.Tests;

public class WaveReportTests
{
    [Fact]
    public void Run_ListsWavesOnTheSchedule()
    {
        var rows = WaveReport.Run(["waves", "10 fighter", "--waves", "3", "--runs", "50"]);

        Assert.Equal([6, 8, 11], rows.Select(r => r.Fighters));
        Assert.Equal([36L, 54L, 72L], rows.Select(r => r.LaunchHour));
        Assert.Equal(12.9, rows[0].LaunchRealMinutes, 1);
    }

    [Fact]
    public void Run_BiggerWavesAreHarderToHold()
    {
        var rows = WaveReport.Run(["waves", "6 fighter", "--waves", "6", "--runs", "200", "--defense"]);

        Assert.True(rows[0].DefenderWinPercent > rows[^1].DefenderWinPercent);
    }

    [Fact]
    public void Run_MorePlayersMeansBiggerWaves()
    {
        var rows = WaveReport.Run(["waves", "6 fighter", "--waves", "1", "--players", "5", "--runs", "5"]);

        Assert.Equal(12, rows[0].Fighters);
    }

    [Theory]
    [InlineData("waves")]
    [InlineData("waves", "6 fighter", "--waves", "0")]
    [InlineData("waves", "6 fighter", "--timescale")]
    public void Run_RejectsBadInput(params string[] args) =>
        Assert.Throws<ArgumentException>(() => WaveReport.Run(args));

    [Fact]
    public void Format_PrintsOneLinePerWave()
    {
        var text = WaveReport.Format(WaveReport.Run(["waves", "6 fighter", "--waves", "2", "--runs", "5"]));

        Assert.Equal(2, text.Split(Environment.NewLine).Length);
    }
}
