namespace SpaceGame.Core;

/// <summary>Converts J2000 sky coordinates (right ascension, declination, distance) to a position in the galactic plane.</summary>
public static class GalacticCoordinates
{
    private const double DegreesToRadians = Math.PI / 180;
    private const double MinutesPerDegree = 60;
    private const double DegreesPerHour = 15;
    private const double PoleRaDegrees = 192.85948;
    private const double PoleDecDegrees = 27.12825;
    private const double PoleLongitudeDegrees = 122.93192;
    private const double Hundredths = 100;

    public static (double X, double Y) ToPlane(
        int raHours, double raMinutes, int decDegrees, double decMinutes, double lightYears)
    {
        var ra = (raHours + raMinutes / MinutesPerDegree) * DegreesPerHour * DegreesToRadians;
        var sign = decDegrees < 0 ? -1 : 1;
        var dec = sign * (Math.Abs(decDegrees) + decMinutes / MinutesPerDegree) * DegreesToRadians;
        var poleRa = PoleRaDegrees * DegreesToRadians;
        var poleDec = PoleDecDegrees * DegreesToRadians;

        var latitude = Math.Asin(
            Math.Sin(dec) * Math.Sin(poleDec) + Math.Cos(dec) * Math.Cos(poleDec) * Math.Cos(ra - poleRa));
        var longitude = PoleLongitudeDegrees * DegreesToRadians - Math.Atan2(
            Math.Cos(dec) * Math.Sin(ra - poleRa),
            Math.Sin(dec) * Math.Cos(poleDec) - Math.Cos(dec) * Math.Sin(poleDec) * Math.Cos(ra - poleRa));

        return (Round(lightYears * Math.Cos(latitude) * Math.Cos(longitude)),
            Round(lightYears * Math.Cos(latitude) * Math.Sin(longitude)));
    }

    private static double Round(double value) => Math.Round(value * Hundredths) / Hundredths;
}
