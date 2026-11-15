using SpaceGame.Core;

namespace SpaceGame.Sim;

/// <summary>Totals over many simulated battles.</summary>
public sealed record SimSummary(
    int Runs, int AttackerWins, double AttackerSurvivors, double DefenderSurvivors,
    double AttackerCostLost, double DefenderCostLost);

/// <summary>Runs one fight many times with seeded dice.</summary>
public static class Simulation
{
    private const int DefenseBonus = 1; // the Defense building: defenders hit one number lower

    /// <summary>Fights <see cref="SimArgs.Runs"/> times and averages the outcome.</summary>
    public static SimSummary Run(SimArgs args)
    {
        var dice = new SeededDice(args.Seed);
        var attackers = ToSide(args.Attackers);
        var defenders = ToSide(args.Defenders);
        var bonus = args.Defense ? DefenseBonus : 0;
        int wins = 0, attSurvivors = 0, defSurvivors = 0, attLost = 0, defLost = 0;

        for (var run = 0; run < args.Runs; run++)
        {
            var result = BattleResolver.Resolve(attackers, defenders, bonus, dice);

            if (result.AttackersWon) wins++;
            attSurvivors += result.Attackers.Ships.Count;
            defSurvivors += result.Defenders.Ships.Count;
            attLost += CostOfLosses(attackers, result.Attackers);
            defLost += CostOfLosses(defenders, result.Defenders);
        }

        double runCount = args.Runs;

        return new SimSummary(args.Runs, wins, attSurvivors / runCount, defSurvivors / runCount, attLost / runCount, defLost / runCount);
    }

    private const double PercentScale = 100.0;

    /// <summary>The text printed by the console app.</summary>
    public static string Format(SimSummary summary) => string.Join(Environment.NewLine,
        $"Runs: {summary.Runs}",
        $"Attacker win rate: {PercentScale * summary.AttackerWins / summary.Runs:F1}%",
        $"Average survivors: attackers {summary.AttackerSurvivors:F2}, defenders {summary.DefenderSurvivors:F2}",
        $"Efficiency (average resource cost lost): attackers {summary.AttackerCostLost:F1}, defenders {summary.DefenderCostLost:F1}");

    private static BattleSide ToSide(IReadOnlyDictionary<ShipType, int> fleet)
    {
        var ships = new List<BattleShip>();

        foreach (var (type, count) in fleet)
        {
            var spec = Catalog.Default.Ship(type);
            ships.AddRange(Enumerable.Repeat(new BattleShip(type, spec.HitsOn, spec.Shots, spec.Hp), count));
        }

        return new BattleSide(ships);
    }

    private static int CostOfLosses(BattleSide before, BattleSide after)
    {
        // Per ship type: ships present before minus ships still alive after, priced at that type's cost.
        var lost = before.Ships.GroupBy(ship => ship.Type).Sum(g =>
            (g.Count() - after.Ships.Count(ship => ship.Type == g.Key)) * Catalog.Default.Ship(g.Key).Cost.Total);

        return lost;
    }
}
