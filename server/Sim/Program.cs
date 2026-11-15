// Battle simulator: dotnet run --project server/Sim -- fight "10 fighter" "2 battleship" --runs 1000 [--defense] [--weapons] [--seed S]
using SpaceGame.Sim;

try
{
    Console.WriteLine(Simulation.Format(Simulation.Run(SimArgs.Parse(args))));
}
catch (ArgumentException e)
{
    Console.Error.WriteLine(e.Message);

    return 1;
}

return 0;
