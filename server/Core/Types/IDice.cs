namespace SpaceGame.Core;

/// <summary>The only source of randomness in Core. Tests script it, the simulator seeds it.</summary>
public interface IDice
{
    /// <summary>Rolls one six-sided die: 1 to 6.</summary>
    int Roll();
}
