namespace SpaceGame.Core;

/// <summary>Known planets of the catalogued stars. Composition is unknown, so richness comes from the kind.</summary>
internal static class ExoplanetTable
{
    public static readonly IReadOnlyList<(string Star, string Name, double OrbitAu, PlanetKind Kind, int DiameterKm)> All =
    [
        ("Proxima Centauri", "Proxima b", 0.0485, PlanetKind.Rocky, 13000),
        ("Proxima Centauri", "Proxima d", 0.0289, PlanetKind.Desert, 8900),
        ("Proxima Centauri", "Proxima c", 1.489, PlanetKind.Gas, 30000),
        (StarNames.BarnardsStar, "Barnard's Star d", 0.0187, PlanetKind.Desert, 8500),
        (StarNames.BarnardsStar, "Barnard's Star b", 0.0229, PlanetKind.Desert, 9700),
        (StarNames.BarnardsStar, "Barnard's Star c", 0.0273, PlanetKind.Desert, 9300),
        (StarNames.BarnardsStar, "Barnard's Star e", 0.0379, PlanetKind.Desert, 9000),
        ("Lalande 21185", "Lalande 21185 b", 0.0789, PlanetKind.Desert, 16650),
        ("Lalande 21185", "Lalande 21185 c", 2.94, PlanetKind.Gas, 44000),
        ("Epsilon Eridani", "Epsilon Eridani b", 3.5, PlanetKind.Gas, 140000),
        ("Lacaille 9352", "Lacaille 9352 b", 0.068, PlanetKind.Desert, 18800),
        ("Lacaille 9352", "Lacaille 9352 c", 0.12, PlanetKind.Rocky, 22000),
        ("Ross 128", "Ross 128 b", 0.0496, PlanetKind.Rocky, 13950),
        ("Groombridge 34", "Groombridge 34 b", 0.072, PlanetKind.Desert, 17100),
        ("Groombridge 34", "Groombridge 34 c", 5.4, PlanetKind.Gas, 55000),
        (StarNames.TauCeti, "Tau Ceti g", 0.133, PlanetKind.Rocky, 14800),
        (StarNames.TauCeti, "Tau Ceti h", 0.243, PlanetKind.Rocky, 14900),
        (StarNames.TauCeti, "Tau Ceti e", 0.538, PlanetKind.Rocky, 18300),
        (StarNames.TauCeti, "Tau Ceti f", 1.334, PlanetKind.Rocky, 18300),
        ("Epsilon Indi", "Epsilon Indi Ab", 28, PlanetKind.Gas, 140000),
        ("Gliese 1061", "Gliese 1061 b", 0.021, PlanetKind.Desert, 13900),
        ("Gliese 1061", "Gliese 1061 c", 0.035, PlanetKind.Rocky, 14800),
        ("Gliese 1061", "Gliese 1061 d", 0.054, PlanetKind.Rocky, 14500),
        ("YZ Ceti", "YZ Ceti b", 0.0156, PlanetKind.Desert, 11570),
        ("YZ Ceti", "YZ Ceti c", 0.0216, PlanetKind.Desert, 13200),
        ("YZ Ceti", "YZ Ceti d", 0.0285, PlanetKind.Desert, 13000),
        ("Luyten's Star", "Luyten's Star c", 0.0365, PlanetKind.Desert, 13300),
        ("Luyten's Star", "Luyten's Star b", 0.0911, PlanetKind.Rocky, 16950),
    ];
}
