namespace SpaceGame.Core;

/// <summary>An amount of each of the four resources.</summary>
public sealed record Resources(int Iron, int Hydrogen, int Titanium, int Helium3)
{
    /// <summary>No resources at all.</summary>
    public static readonly Resources Zero = new(0, 0, 0, 0);

    /// <summary>Adds two amounts.</summary>
    public static Resources operator +(Resources a, Resources b) =>
        new(a.Iron + b.Iron, a.Hydrogen + b.Hydrogen, a.Titanium + b.Titanium, a.Helium3 + b.Helium3);

    /// <summary>Subtracts two amounts (a component may go negative; check <see cref="Covers"/> first).</summary>
    public static Resources operator -(Resources a, Resources b) =>
        new(a.Iron - b.Iron, a.Hydrogen - b.Hydrogen, a.Titanium - b.Titanium, a.Helium3 - b.Helium3);

    /// <summary>True when every component is at least the matching component of <paramref name="cost"/>.</summary>
    public bool Covers(Resources cost) =>
        Iron >= cost.Iron && Hydrogen >= cost.Hydrogen && Titanium >= cost.Titanium && Helium3 >= cost.Helium3;
}
