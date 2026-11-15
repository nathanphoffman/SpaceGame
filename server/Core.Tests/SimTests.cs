using SpaceGame.Sim;

namespace SpaceGame.Core.Tests;

public class SimTests
{
    [Fact]
    public void Parse_ReadsFleetsAndOptions()
    {
        var a = SimArgs.Parse(["fight", "10 fighter", "2 battleship, 1 scout", "--runs", "50", "--defense", "--seed", "7"]);
        Assert.Equal(10, a.Attackers[ShipType.Fighter]);
        Assert.Equal(2, a.Defenders[ShipType.Battleship]);
        Assert.Equal(1, a.Defenders[ShipType.Scout]);
        Assert.Equal(50, a.Runs);
        Assert.True(a.Defense);
        Assert.Equal(7, a.Seed);
    }

    [Fact]
    public void Parse_UsesDefaults()
    {
        var a = SimArgs.Parse(["fight", "1 Fighter", "1 fighter"]);
        Assert.Equal(1000, a.Runs);
        Assert.False(a.Defense);
    }

    [Theory]
    [InlineData("fight", "10 fighter")]
    [InlineData("fight", "10 spaceship", "1 fighter")]
    [InlineData("fight", "fighter", "1 fighter")]
    [InlineData("fight", "1 fighter", "1 fighter", "--runs")]
    [InlineData("fight", "1 fighter", "1 fighter", "--bogus")]
    public void Parse_RejectsBadInput(params string[] args) =>
        Assert.Throws<ArgumentException>(() => SimArgs.Parse(args));

    [Fact]
    public void Run_SameSeedGivesSameResult()
    {
        var a = SimArgs.Parse(["fight", "10 fighter", "2 battleship", "--runs", "100"]);
        Assert.Equal(Simulation.Run(a), Simulation.Run(a));
    }

    [Fact]
    public void Run_OverwhelmingFleetAlwaysWins()
    {
        var a = SimArgs.Parse(["fight", "1 dreadnought, 20 fighter", "1 scout", "--runs", "20"]);
        var summary = Simulation.Run(a);
        Assert.Equal(20, summary.AttackerWins);
        Assert.Equal(0, summary.DefenderSurvivors);
        Assert.Equal(20, summary.DefenderCostLost); // a Scout costs 20 in total
    }
}
