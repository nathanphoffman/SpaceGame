using System.Text.Json.Serialization;
using SpaceGame.Core;

namespace SpaceGame.Server.Api;

/// <summary>Which planet, fleet or queue item a command points at.</summary>
public sealed record CommandTarget(string? Planet, string? From, string? To, string? Fleet, string? ItemId);

/// <summary>The named choices of a command. Enum values are plain names ("Mine", "Fighter"), so a number or a typo is rejected, not guessed.</summary>
public sealed record CommandChoice(string? BuildingType, string? Element, string? ShipType, int? Count, string? UpgradeType);

/// <summary>What a send-fleet order carries.</summary>
public sealed record FleetPayload(Dictionary<string, int>? Ships, Resources? Cargo);

/// <summary>
/// One command as the client sends it: a type plus the fields that type needs.
/// On the wire it is one flat JSON object (see <see cref="FlatCommandBodyConverter"/>).
/// </summary>
[JsonConverter(typeof(FlatCommandBodyConverter))]
public sealed record CommandBody(string? Type, CommandTarget Target, CommandChoice Choice, FleetPayload Payload);

/// <summary>Either a command or the reason it was refused.</summary>
public sealed record ParsedCommand(GameCommand? Command, string? Error);
