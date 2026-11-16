using SpaceGame.Sim;

namespace SpaceGame.Core.Tests;

public class SimTests
{
    private const string FightCommand = "fight";
    [Fact]
    public void ParseReadsFleets()
    {
        var args = SimArgs.Parse([FightCommand, "10 fighter", "2 battleship, 1 scout", "--runs", "50", "--defense", "2", "--seed", "7"]);
        Assert.Equal(10, args.Attackers[ShipType.Fighter]);
        Assert.Equal(2, args.Defenders[ShipType.Battleship]);
        Assert.Equal(1, args.Defenders[ShipType.Scout]);
        Assert.Equal(50, args.Runs);
        Assert.Equal(2, args.DefenseLevel);
        Assert.Equal(7, args.Seed);
    }

    [Fact]
    public void ParseUsesDefaults()
    {
        var args = SimArgs.Parse([FightCommand, "1 Fighter", "1 fighter"]);
        Assert.Equal(1000, args.Runs);
        Assert.Equal(0, args.DefenseLevel);
    }

    [Theory]
    [InlineData(FightCommand, "10 fighter")]
    [InlineData(FightCommand, "10 spaceship", "1 fighter")]
    [InlineData(FightCommand, "fighter", "1 fighter")]
    [InlineData(FightCommand, "1 fighter", "1 fighter", "--runs")]
    [InlineData(FightCommand, "1 fighter", "1 fighter", "--bogus")]
    public void ParseRejectsBadInput(params string[] args) =>
        Assert.Throws<ArgumentException>(() => SimArgs.Parse(args));

    [Fact]
    public void RunSameSeedGivesSameResult()
    {
        var args = SimArgs.Parse([FightCommand, "10 fighter", "2 battleship", "--runs", "100"]);
        Assert.Equal(Simulation.Run(args), Simulation.Run(args));
    }

    [Fact]
    public void RunOverwhelmingFleetAlwaysWins()
    {
        var args = SimArgs.Parse([FightCommand, "1 dreadnought, 20 fighter", "1 scout", "--runs", "20"]);
        var summary = Simulation.Run(args);
        Assert.Equal(20, summary.AttackerWins);
        Assert.Equal(0, summary.DefenderSurvivors);
        Assert.Equal(20, summary.DefenderCostLost); // a Scout costs 20 in total
    }

    [Fact]
    public void RunDefenseLevelsHelpTheDefenders()
    {
        var plain = Simulation.Run(SimArgs.Parse([FightCommand, "6 fighter", "6 fighter", "--runs", "500"]));
        var reroll = Simulation.Run(SimArgs.Parse([FightCommand, "6 fighter", "6 fighter", "--runs", "500", "--defense", "1"]));
        var more = Simulation.Run(SimArgs.Parse([FightCommand, "6 fighter", "6 fighter", "--runs", "500", "--defense", "3"]));
        Assert.True(reroll.AttackerWins < plain.AttackerWins);
        Assert.True(more.AttackerWins <= reroll.AttackerWins);
    }

    [Fact]
    public void FormatPrintsFlagsInHeader()
    {
        var text = Simulation.Format(Simulation.Run(SimArgs.Parse([FightCommand, "1 fighter", "1 fighter", "--runs", "2", "--defense", "2"])));
        Assert.StartsWith("Options: defense level 2", text);
    }
}
