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

    /// <summary>Total of all four components.</summary>
    public int Total => Iron + Hydrogen + Titanium + Helium3;

    /// <summary>True when any component is below zero.</summary>
    public bool HasNegative => Iron < 0 || Hydrogen < 0 || Titanium < 0 || Helium3 < 0;

    /// <summary>Multiplies every component by <paramref name="factor"/>, rounding to the nearest whole number.</summary>
    public Resources Scale(double factor) => new(
        (int)Math.Round(Iron * factor), (int)Math.Round(Hydrogen * factor),
        (int)Math.Round(Titanium * factor), (int)Math.Round(Helium3 * factor));

    /// <summary>Multiplies every component by a whole number.</summary>
    public static Resources operator *(Resources a, int n) => new(a.Iron * n, a.Hydrogen * n, a.Titanium * n, a.Helium3 * n);

    /// <summary>The amount of one element.</summary>
    public int Get(Element element) => element switch
    {
        Element.Iron => Iron,
        Element.Hydrogen => Hydrogen,
        Element.Titanium => Titanium,
        _ => Helium3,
    };
}
