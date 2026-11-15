using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

public class SeededDiceTests
{
    [Fact]
    public void Same_seed_with_same_time_give_the_same_dice()
    {
        var first = new SeededDice(5, 100);
        var second = new SeededDice(5, 100);
        Assert.Equal(Enumerable.Range(0, 20).Select(_ => first.Roll()), Enumerable.Range(0, 20).Select(_ => second.Roll()));
    }
}
