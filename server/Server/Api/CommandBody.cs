using SpaceGame.Core;

namespace SpaceGame.Server.Api;

/// <summary>
/// One command as the client sends it: a type plus the fields that type needs.
/// Enum values are plain names ("Mine", "Fighter") so a number or a typo is rejected, not guessed.
/// </summary>
public sealed record CommandBody(
    string? Type,
    string? Planet,
    string? BuildingType,
    string? Element,
    string? ShipType,
    int? Count,
    string? UpgradeType,
    string? From,
    string? To,
    Dictionary<string, int>? Ships,
    Resources? Cargo,
    string? Fleet,
    string? ItemId);

/// <summary>Either a command or the reason it was refused.</summary>
public sealed record ParsedCommand(GameCommand? Command, string? Error);
