namespace SpaceGame.Core;

/// <summary>Named lengths of time in game seconds, shared by the rules and their defaults.</summary>
public static class GameSeconds
{
    public const long Minute = 60;
    public const long Hour = 60 * Minute;
    public const long Day = 24 * Hour;
    public const long Week = 7 * Day;
}
