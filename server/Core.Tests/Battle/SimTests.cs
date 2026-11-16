using SpaceGame.Sim;

namespace SpaceGame.Core.Tests;

public class SimTests
{
    private const string FightCommand = "fight";
    [Fact]
    public void ParseReadsFleets()
    {
        var args = SimArgs.Parse([FightCommand, "10 fighter", "2 battleship, 1 scout", "--runs", "50", "--defense", "--weapons", "--seed", "7"]);
        Assert.Equal(10, args.Attackers[ShipType.Fighter]);
        Assert.Equal(2, args.Defenders[ShipType.Battleship]);
        Assert.Equal(1, args.Defenders[ShipType.Scout]);
        Assert.Equal(50, args.Runs);
        Assert.True(args.Defense);
        Assert.True(args.Weapons);
        Assert.Equal(7, args.Seed);
    }

    [Fact]
    public void ParseUsesDefaults()
    {
        var args = SimArgs.Parse([FightCommand, "1 Fighter", "1 fighter"]);
        Assert.Equal(1000, args.Runs);
        Assert.False(args.Defense);
        Assert.False(args.Weapons);
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
    public void RunWeaponsHelpTheDefenders()
    {
        var plain = Simulation.Run(SimArgs.Parse([FightCommand, "6 fighter", "6 fighter", "--runs", "500"]));
        var armed = Simulation.Run(SimArgs.Parse([FightCommand, "6 fighter", "6 fighter", "--runs", "500", "--weapons"]));
        Assert.True(armed.AttackerWins < plain.AttackerWins);
    }

    [Fact]
    public void FormatPrintsFlagsInHeader()
    {
        var text = Simulation.Format(Simulation.Run(SimArgs.Parse([FightCommand, "1 fighter", "1 fighter", "--runs", "2", "--weapons"])));
        Assert.StartsWith("Options: defense off, weapons on", text);
    }
}
