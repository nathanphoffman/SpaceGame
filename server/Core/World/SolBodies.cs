namespace SpaceGame.Core;

/// <summary>The real planets of the Solar System. Compositions are a gameplay approximation (Earth has a little of everything).</summary>
internal static class SolBodies
{
    public static readonly IReadOnlyList<(string Name, double OrbitAu, PlanetKind Kind, int DiameterKm, string Composition)> All =
    [
        ("Mercury", 0.387, PlanetKind.Moon, 4879, "Fe60 Si20 O10 Al6 Ti4"),
        ("Venus", 0.723, PlanetKind.Desert, 12104, "O40 Fe25 Si20 Al8 C4 Ti3"),
        ("Earth", 1.0, PlanetKind.Rocky, 12742, "Fe30 O28 Si18 Al9 Ti6 C5 U4"),
        ("Mars", 1.524, PlanetKind.Desert, 6779, "O32 Fe30 Si20 Al8 C5 Ti5"),
        ("Jupiter", 5.204, PlanetKind.Gas, 139820, "H82 He12 C3 O3"),
        ("Saturn", 9.58, PlanetKind.Gas, 116460, "H85 He9 C3 O3"),
        ("Uranus", 19.2, PlanetKind.Gas, 50724, "H55 O20 C15 He10"),
        ("Neptune", 30.07, PlanetKind.Gas, 49244, "H52 O22 C16 He10"),
        ("Pluto", 39.5, PlanetKind.Ice, 2377, "H35 O25 C20 Si12 Fe8"),
    ];
}
