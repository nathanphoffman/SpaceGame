namespace SpaceGame.Core;

/// <summary>
/// Turns a real composition such as "Fe30 O28 Si18" into the game's four elements:
/// Fe, Si, Al, C become Iron; O and H become Hydrogen; Ti is Titanium; U and He become Helium-3.
/// </summary>
public static class Composition
{
    private static readonly Dictionary<string, Element> ElementOf = new()
    {
        ["Fe"] = Element.Iron,
        ["Si"] = Element.Iron,
        ["Al"] = Element.Iron,
        ["C"] = Element.Iron,
        ["O"] = Element.Hydrogen,
        ["H"] = Element.Hydrogen,
        ["Ti"] = Element.Titanium,
        ["U"] = Element.Helium3,
        ["He"] = Element.Helium3,
    };

    public static Richness Parse(string composition)
    {
        var totals = new Dictionary<Element, int>();

        foreach (var part in composition.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var (symbol, percent) = SplitPart(part);
            var element = ElementOf[symbol];
            totals[element] = totals.GetValueOrDefault(element) + percent;
        }

        return new Richness(
            totals.GetValueOrDefault(Element.Iron),
            totals.GetValueOrDefault(Element.Hydrogen),
            totals.GetValueOrDefault(Element.Titanium),
            totals.GetValueOrDefault(Element.Helium3));
    }

    private static (string Symbol, int Percent) SplitPart(string part)
    {
        var digitsAt = part.IndexOfAny("0123456789".ToCharArray());

        return (part[..digitsAt], int.Parse(part[digitsAt..]));
    }

    /// <summary>Guess for worlds whose composition is not known.</summary>
    public static Richness DefaultFor(PlanetKind kind) => Parse(kind switch
    {
        PlanetKind.Rocky => "Fe35 Si15 Al8 C4 O22 Ti12 U4",
        PlanetKind.Desert => "O35 Fe30 Si20 Al8 C4 Ti3",
        PlanetKind.Gas => "H80 He15 C3 O2",
        PlanetKind.Ice => "H35 O25 C20 Si12 Fe8",
        _ => "Fe60 Si20 O10 Al6 Ti4",
    });
}
