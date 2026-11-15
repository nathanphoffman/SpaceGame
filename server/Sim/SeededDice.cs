using SpaceGame.Core;

namespace SpaceGame.Sim;

/// <summary>Repeatable dice for the simulator.</summary>
public sealed class SeededDice(int seed) : IDice
{
    private const int Sides = 6;
    private readonly Random _random = new(seed);

    public int Roll() => _random.Next(1, Sides + 1);
}
