namespace SpaceGame.Core;

/// <summary>Raw star rows: name, RA hours, RA minutes, Dec degrees, Dec minutes, light-years, spectral type. The 24 closest to Sol.</summary>
internal static class StarTable
{
    public sealed record Row(string Name, int RaH, double RaM, int DecD, double DecM, double LightYears, string Spectral);

    public static readonly IReadOnlyList<Row> Rows =
    [
        new("Sol", 0, 0, 0, 0, 0, "G2V"),
        new("Proxima Centauri", 14, 29.7, -62, 40.8, 4.24, "M5V"),
        new("Alpha Centauri", 14, 39.6, -60, 50.0, 4.37, "G2V"),
        new("Barnard's Star", 17, 57.8, 4, 41.6, 5.96, "M4V"),
        new("Wolf 359", 10, 56.5, 7, 0.9, 7.86, "M6V"),
        new("Lalande 21185", 11, 3.3, 35, 58.2, 8.3, "M2V"),
        new("Sirius", 6, 45.1, -16, 43.0, 8.6, "A1V"),
        new("Luyten 726-8", 1, 39.0, -17, 57.0, 8.73, "M5V"),
        new("Ross 154", 18, 49.8, -23, 50.2, 9.69, "M3V"),
        new("Ross 248", 23, 41.9, 44, 10.5, 10.3, "M6V"),
        new("Epsilon Eridani", 3, 32.9, -9, 27.5, 10.47, "K2V"),
        new("Lacaille 9352", 23, 5.9, -35, 51.2, 10.7, "M0V"),
        new("Ross 128", 11, 47.7, 0, 48.3, 11.0, "M4V"),
        new("EZ Aquarii", 22, 38.6, -15, 18.1, 11.3, "M5V"),
        new("61 Cygni", 21, 6.9, 38, 45.0, 11.4, "K5V"),
        new("Procyon", 7, 39.3, 5, 13.5, 11.46, "F5V"),
        new("Struve 2398", 18, 42.8, 59, 37.8, 11.5, "M3V"),
        new("Groombridge 34", 0, 18.4, 44, 1.4, 11.6, "M1V"),
        new("DX Cancri", 8, 29.8, 26, 46.6, 11.7, "M6V"),
        new("Epsilon Indi", 22, 3.4, -56, 47.2, 11.87, "K5V"),
        new("Tau Ceti", 1, 44.1, -15, 56.2, 11.9, "G8V"),
        new("Gliese 1061", 3, 36.0, -44, 30.8, 12.0, "M5V"),
        new("YZ Ceti", 1, 12.5, -16, 59.9, 12.1, "M4V"),
        new("Luyten's Star", 7, 27.4, 5, 13.6, 12.35, "M3V"),
    ];
}
