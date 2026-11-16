namespace SpaceGame.Core;

/// <summary>An amount of each of the four resources.</summary>
public sealed record Resources(int Iron, int Hydrogen, int Titanium, int Helium3)
{
    /// <summary>No resources at all.</summary>
    public static readonly Resources Zero = new(0, 0, 0, 0);

    /// <summary>Adds two amounts.</summary>
    public static Resources operator +(Resources left, Resources right) =>
        new(left.Iron + right.Iron, left.Hydrogen + right.Hydrogen, left.Titanium + right.Titanium, left.Helium3 + right.Helium3);

    /// <summary>Subtracts two amounts (left component may go negative; check <see cref="Covers"/> first).</summary>
    public static Resources operator -(Resources left, Resources right) =>
        new(left.Iron - right.Iron, left.Hydrogen - right.Hydrogen, left.Titanium - right.Titanium, left.Helium3 - right.Helium3);

    /// <summary>True when every component is at least the matching component of <paramref name="cost"/>.</summary>
    public bool Covers(Resources cost) =>
        Iron >= cost.Iron && Hydrogen >= cost.Hydrogen && Titanium >= cost.Titanium && Helium3 >= cost.Helium3;

    /// <summary>Total of all four components.</summary>
    public int Total => Iron + Hydrogen + Titanium + Helium3;

    /// <summary>True when any component is below zero.</summary>
    public bool HasNegative => Iron < 0 || Hydrogen < 0 || Titanium < 0 || Helium3 < 0;

    /// <summary>Multiplies every component by <paramref name="factor"/>, rounding to the nearest whole number.</summary>
    public Resources Scale(double factor) => new(
        Scaled(Iron, factor), Scaled(Hydrogen, factor), Scaled(Titanium, factor), Scaled(Helium3, factor));

    // Very high levels cost more than any stockpile can hold; clamping keeps the number from wrapping to something cheap.
    private static int Scaled(int amount, double factor) => (int)Math.Min(int.MaxValue / 2, Math.Round(amount * factor));

    /// <summary>Multiplies every component by left whole number.</summary>
    public static Resources operator *(Resources left, int n) => new(left.Iron * n, left.Hydrogen * n, left.Titanium * n, left.Helium3 * n);

    /// <summary>The amount of one element.</summary>
    public int Get(Element element) => element switch
    {
        Element.Iron => Iron,
        Element.Hydrogen => Hydrogen,
        Element.Titanium => Titanium,
        _ => Helium3,
    };
}
