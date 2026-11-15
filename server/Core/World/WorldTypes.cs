namespace SpaceGame.Core;

/// <summary>What a world is made of, in the game's four elements. Each value is a percentage of the body.</summary>
public sealed record Richness(int Iron, int Hydrogen, int Titanium, int Helium3)
{
    // Looks up the richness of one element.
    public int Of(Element element) => element switch
    {
        Element.Iron => Iron,
        Element.Hydrogen => Hydrogen,
        Element.Titanium => Titanium,
        _ => Helium3,
    };
}

/// <summary>The broad type of a planet. Decides the default richness of worlds with no known composition.</summary>
public enum PlanetKind { Rocky, Desert, Gas, Ice, Moon }

/// <summary>One real or catalogued world: plain data, no game state.</summary>
public sealed record WorldPlanet(
    PlanetId Id,
    SystemId System,
    string Name,
    double OrbitAu,
    PlanetKind Kind,
    int DiameterKm,
    Richness Richness);

/// <summary>One star system with its planets. X and Y are light-years in the galactic plane, Sol at 0,0.</summary>
public sealed record WorldStar(
    SystemId Id,
    string Name,
    string SpectralType,
    double X,
    double Y,
    double LightYears,
    IReadOnlyList<WorldPlanet> Planets);
