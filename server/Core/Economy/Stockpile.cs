namespace SpaceGame.Core;

/// <summary>Mine output rules.</summary>
public static class MineOutput
{
    /// <summary>Thousandths of a unit, so rates stay whole numbers.</summary>
    public const int MilliPerUnit = 1000;

    /// <summary>Output of one mine in thousandths of a unit per hour, with the Mining upgrade applied.</summary>
    public static int MilliPerHour(Catalog catalog, int mineLevel, int richness, int miningUpgradeLevel)
    {
        var bonus = 1 + catalog.Upgrade(UpgradeType.Mining).BonusPerLevel * miningUpgradeLevel;
        var perHour = catalog.Mine.OutputPerHour(mineLevel, richness) * bonus;

        return (int)Math.Round(perHour * MilliPerUnit);
    }

    /// <summary>A rate that puts <paramref name="milliPerHour"/> into one element's slot.</summary>
    public static Resources RateFor(Element element, int milliPerHour) => element switch
    {
        Element.Iron => new(milliPerHour, 0, 0, 0),
        Element.Hydrogen => new(0, milliPerHour, 0, 0),
        Element.Titanium => new(0, 0, milliPerHour, 0),
        _ => new(0, 0, 0, milliPerHour),
    };
}

/// <summary>
/// A player's one stockpile. <paramref name="Carry"/> holds the fraction not yet turned into whole units
/// (in milli-units times seconds, always below one unit), so nothing is lost however often it is updated.
/// </summary>
public sealed record Stockpile(Resources Amount, long Time, Resources Carry)
{
    private const long SecondsPerHour = 3600;
    private const long CarryPerUnit = (long)MineOutput.MilliPerUnit * SecondsPerHour;

    /// <summary>A stockpile with a starting amount at a time.</summary>
    public static Stockpile Open(Resources amount, long time) => new(amount, time, Resources.Zero);

    /// <summary>Brings the stockpile up to <paramref name="nowSeconds"/> at a constant rate (milli-units per hour per element).</summary>
    public Stockpile AdvanceTo(long nowSeconds, Resources ratePerHourMilli)
    {
        var seconds = nowSeconds - Time;

        if (seconds <= 0) return this;
        var iron = Step(Amount.Iron, Carry.Iron, ratePerHourMilli.Iron, seconds);
        var hydrogen = Step(Amount.Hydrogen, Carry.Hydrogen, ratePerHourMilli.Hydrogen, seconds);
        var titanium = Step(Amount.Titanium, Carry.Titanium, ratePerHourMilli.Titanium, seconds);
        var helium = Step(Amount.Helium3, Carry.Helium3, ratePerHourMilli.Helium3, seconds);

        return new Stockpile(
            new Resources(iron.Units, hydrogen.Units, titanium.Units, helium.Units), nowSeconds,
            new Resources(iron.Carry, hydrogen.Carry, titanium.Carry, helium.Carry));
    }

    /// <summary>Takes a cost out (the caller checks <see cref="Resources.Covers"/> first).</summary>
    public Stockpile Spend(Resources cost) => this with { Amount = Amount - cost };

    /// <summary>Adds whole units (for example a Hauler delivery).</summary>
    public Stockpile Add(Resources gain) => this with { Amount = Amount + gain };

    private static (int Units, int Carry) Step(int units, int carry, int rate, long seconds)
    {
        var total = carry + (long)rate * seconds;

        return ((int)(units + total / CarryPerUnit), (int)(total % CarryPerUnit));
    }
}
