using SpaceGame.Core;

namespace SpaceGame.Sim;

/// <summary>One Earth attack wave checked against a fixed defense.</summary>
public sealed record WaveRow(int Wave, long LaunchHour, double LaunchRealMinutes, int Fighters, double DefenderWinPercent);

/// <summary>The <c>waves</c> command: every scheduled Earth attack, wave by wave, against one defending fleet.</summary>
public static class WaveReport
{
    private const double PercentScale = 100.0;
    private const double SecondsPerMinute = 60.0;
    private const int DefaultTimeScale = 168;
    private const int DefaultWaves = 6;

    /// <summary>Parses <c>waves "10 fighter" [--timescale N] [--waves N] [--players N] [--runs N] [--defense LEVEL] [--seed S]</c>.</summary>
    public static IReadOnlyList<WaveRow> Run(string[] args)
    {
        if (args.Length < 2 || args[0] != "waves")

            throw new ArgumentException("Usage: waves \"<count> <ship>, ...\" [--timescale N] [--waves N] [--players N] [--runs N] [--defense LEVEL] [--seed S]");

        var options = new List<string> { "fight", "1 fighter", args[1] };
        var timeScale = DefaultTimeScale;
        var waves = DefaultWaves;
        var players = 1;

        for (var i = 2; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--timescale": timeScale = Number(args, ref i); break;

                case "--waves": waves = Number(args, ref i); break;

                case "--players": players = Number(args, ref i); break;

                default: options.Add(args[i]); if (args[i] is "--runs" or "--seed") options.Add(args[++i]); break;
            }
        }

        if (timeScale < 1 || waves < 1 || players < 1) throw new ArgumentException("--timescale, --waves and --players must be at least 1.");

        return Rows(SimArgs.Parse([.. options]), timeScale, waves, players);
    }

    private static IReadOnlyList<WaveRow> Rows(SimArgs defense, int timeScale, int waves, int players)
    {
        var enemy = new EnemyConfig();

        return Enumerable.Range(0, waves).Select(index =>
        {
            var fighters = EarthAttackSchedule.Fighters(enemy, index, players);
            var summary = Simulation.Run(defense with { Attackers = new Dictionary<ShipType, int> { [ShipType.Fighter] = fighters } });
            var dueAt = EarthAttackSchedule.DueAt(enemy, index);

            return new WaveRow(index + 1, dueAt / GameSeconds.Hour, dueAt / (double)timeScale / SecondsPerMinute, fighters,
                PercentScale * (summary.Runs - summary.AttackerWins) / summary.Runs);
        }).ToList();
    }

    /// <summary>The text printed by the console app.</summary>
    public static string Format(IReadOnlyList<WaveRow> rows) => string.Join(Environment.NewLine,
        rows.Select(r => $"Wave {r.Wave}: launch hour {r.LaunchHour} (real minute {r.LaunchRealMinutes:F1}), {r.Fighters} fighters, defender win rate {r.DefenderWinPercent:F1}%"));

    private static int Number(string[] args, ref int i)
    {
        if (i + 1 >= args.Length || !int.TryParse(args[i + 1], out var value))

            throw new ArgumentException($"{args[i]} needs a number.");

        i++;

        return value;
    }
}
