using SpaceGame.Core;

namespace SpaceGame.Server.Api;

/// <summary>Turns a <see cref="CommandBody"/> into a Core command, refusing anything incomplete or unknown.</summary>
public static class CommandParser
{
    public static ParsedCommand Parse(CommandBody? body)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.Type))
        {
            return Fail("A command needs a type.");
        }

        return body.Type switch
        {
            "buildBuilding" => BuildBuilding(body),
            "queueShip" => QueueShip(body),
            "startUpgrade" => StartUpgrade(body),
            "sendFleet" => SendFleet(body),
            "recallFleet" => Need(body.Target.Fleet, "fleet", id => new RecallFleet(new FleetId(id))),
            "colonize" => Need(body.Target.Planet, "planet", id => new Colonize(new PlanetId(id))),
            "cancelQueueItem" => CancelQueueItem(body),
            _ => Fail($"Unknown command type '{body.Type}'."),
        };
    }

    private static ParsedCommand BuildBuilding(CommandBody b)
    {
        if (!Enum<BuildingType>(b.Choice.BuildingType, "buildingType", out var type, out var error) || Missing(b.Target.Planet, "planet", out error))
        {
            return Fail(error!);
        }

        var needsElement = type == Core.BuildingType.Mine;

        if (needsElement != (b.Choice.Element is not null))
        {
            return Fail(needsElement ? "A mine needs an element." : "Only a mine takes an element.");
        }

        if (!needsElement)
        {
            return Ok(new BuildBuilding(new PlanetId(b.Target.Planet!), type, null));
        }

        return Enum<Element>(b.Choice.Element, "element", out var element, out error)
            ? Ok(new BuildBuilding(new PlanetId(b.Target.Planet!), type, element))
            : Fail(error!);
    }

    private static ParsedCommand QueueShip(CommandBody b)
    {
        if (!Enum<ShipType>(b.Choice.ShipType, "shipType", out var ship, out var error) || Missing(b.Target.Planet, "planet", out error))
        {
            return Fail(error!);
        }

        return b.Choice.Count is > 0
            ? Ok(new QueueShip(new PlanetId(b.Target.Planet!), ship, b.Choice.Count.Value))
            : Fail("Count must be at least 1.");
    }

    private static ParsedCommand StartUpgrade(CommandBody b) =>
        Enum<UpgradeType>(b.Choice.UpgradeType, "upgradeType", out var type, out var error) ? Ok(new StartUpgrade(type)) : Fail(error!);

    private static ParsedCommand CancelQueueItem(CommandBody b) =>
        Missing(b.Target.Planet, "planet", out var error) || Missing(b.Target.ItemId, "itemId", out error)
            ? Fail(error!)
            : Ok(new CancelQueueItem(new PlanetId(b.Target.Planet!), b.Target.ItemId!));

    private static ParsedCommand SendFleet(CommandBody b)
    {
        if (Missing(b.Target.From, "from", out var error) || Missing(b.Target.To, "to", out error))
        {
            return Fail(error!);
        }

        if (!ParseShips(b.Payload.Ships, out var ships, out error))
        {
            return Fail(error!);
        }

        return Ok(new SendFleet(new PlanetId(b.Target.From!), ships, new PlanetId(b.Target.To!), b.Payload.Cargo));
    }

    private static bool ParseShips(Dictionary<string, int>? input, out Dictionary<ShipType, int> ships, out string? error)
    {
        ships = [];
        error = null;

        if (input is null || input.Count == 0)
        {
            error = "Send at least one ship.";

            return false;
        }

        foreach (var (name, count) in input)
        {
            if (!Enum<ShipType>(name, "ship type", out var type, out error))
            {
                return false;
            }

            if (count < 1)
            {
                error = "Ship counts must be at least 1.";

                return false;
            }

            ships[type] = count;
        }

        return true;
    }

    private static ParsedCommand Need(string? value, string field, Func<string, GameCommand> make) =>
        Missing(value, field, out var error) ? Fail(error!) : Ok(make(value!));

    private static bool Missing(string? value, string field, out string? error)
    {
        error = string.IsNullOrWhiteSpace(value) ? $"Missing {field}." : null;

        return error is not null;
    }

    // Enum.TryParse accepts numbers like "7"; only a defined name is allowed here.
    private static bool Enum<T>(string? value, string field, out T result, out string? error) where T : struct, Enum
    {
        result = default;
        error = null;

        if (!string.IsNullOrWhiteSpace(value) && !char.IsDigit(value[0]) && System.Enum.TryParse(value, true, out result) && System.Enum.IsDefined(result))
        {
            return true;
        }

        error = $"Invalid {field}.";

        return false;
    }

    private static ParsedCommand Ok(GameCommand command) => new(command, null);

    private static ParsedCommand Fail(string error) => new(null, error);
}
