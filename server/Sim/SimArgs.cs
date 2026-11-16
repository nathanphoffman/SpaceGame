using SpaceGame.Core;

namespace SpaceGame.Sim;

/// <summary>Parsed command line of the <c>fight</c> command.</summary>
public sealed record SimArgs(
    IReadOnlyDictionary<ShipType, int> Attackers,
    IReadOnlyDictionary<ShipType, int> Defenders,
    int Runs,
    int DefenseLevel,
    int Seed)
{
    private const int DefaultRuns = 1000;
    private const int DefaultSeed = 1;
    private const int FirstOptionIndex = 3;

    /// <summary>Parses <c>fight "10 fighter" "2 battleship, 1 scout" [--runs N] [--defense LEVEL] [--seed S]</c>.</summary>
    public static SimArgs Parse(string[] args)
    {
        if (args.Length < FirstOptionIndex || args[0] != "fight")

            throw new ArgumentException("Usage: fight \"<count> <ship>, ...\" \"<count> <ship>, ...\" [--runs N] [--defense LEVEL] [--seed S]");

        var runs = DefaultRuns;
        var seed = DefaultSeed;
        var defense = 0;

        for (var i = FirstOptionIndex; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--defense": defense = ReadNumber(args, ref i, "--defense"); break;

                case "--runs": runs = ReadNumber(args, ref i, "--runs"); break;

                case "--seed": seed = ReadNumber(args, ref i, "--seed"); break;

                default: throw new ArgumentException($"Unknown option '{args[i]}'.");
            }
        }

        if (runs < 1) throw new ArgumentException("--runs must be at least 1.");

        if (defense < 0) throw new ArgumentException("--defense cannot be negative.");

        return new SimArgs(ParseFleet(args[1]), ParseFleet(args[2]), runs, defense, seed);
    }

    /// <summary>Parses <c>"10 fighter, 2 battleship"</c> into ship counts.</summary>
    public static IReadOnlyDictionary<ShipType, int> ParseFleet(string text)
    {
        var fleet = new Dictionary<ShipType, int>();

        foreach (var part in text.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var words = part.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (words.Length != 2 || !int.TryParse(words[0], out var count) || count < 1)

                throw new ArgumentException($"Cannot read '{part}'. Use \"<count> <ship>\".");

            if (!Enum.TryParse<ShipType>(words[1], ignoreCase: true, out var type))

                throw new ArgumentException($"Unknown ship '{words[1]}'.");

            fleet[type] = fleet.GetValueOrDefault(type) + count;
        }

        if (fleet.Count == 0) throw new ArgumentException("A fleet needs at least one ship.");

        return fleet;
    }

    private static int ReadNumber(string[] args, ref int i, string name)
    {
        if (i + 1 >= args.Length || !int.TryParse(args[i + 1], out var value))

            throw new ArgumentException($"{name} needs a number.");

        i++;

        return value;
    }
}
