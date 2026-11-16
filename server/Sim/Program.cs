// Battle simulator: dotnet run --project server/Sim -- fight "10 fighter" "2 battleship" --runs 1000 [--defense] [--weapons] [--seed S]
//   dotnet run --project server/Sim -- waves "10 fighter" --timescale 168 --waves 6 --defense
using SpaceGame.Sim;

try
{
    Console.WriteLine(args.Length > 0 && args[0] == "waves"
        ? WaveReport.Format(WaveReport.Run(args))
        : Simulation.Format(Simulation.Run(SimArgs.Parse(args))));
}
catch (ArgumentException e)
{
    Console.Error.WriteLine(e.Message);

    return 1;
}

return 0;
