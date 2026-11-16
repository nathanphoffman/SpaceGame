using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>Advances every running game once per tick. A game that ended is saved as finished, so it is no longer listed as running.</summary>
public sealed class GameClock(IServiceScopeFactory scopes)
{
    public async Task TickAsync()
    {
        await using var scope = scopes.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<GameRepository>();
        var session = scope.ServiceProvider.GetRequiredService<GameSession>();

        foreach (var id in await repo.RunningGameIdsAsync())
        {
            await session.AdvanceAsync(id);
        }
    }
}

/// <summary>Settings from the "GameClock" config section. A shorter tick makes the 1-hour test mode smoother.</summary>
public sealed class GameClockOptions
{
    public const string Section = "GameClock";
    public const int DefaultTickSeconds = 5;

    public int TickSeconds { get; set; } = DefaultTickSeconds;

    public TimeSpan Interval => TimeSpan.FromSeconds(Math.Max(1, TickSeconds));
}

/// <summary>Calls <see cref="GameClock.TickAsync"/> on a timer so the world moves with nobody calling.</summary>
public sealed class GameClockService(GameClock clock, IOptions<GameClockOptions> options, ILogger<GameClockService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.Value.Interval);

        while (await WaitAsync(timer, stoppingToken))
        {
            await TickSafelyAsync();
        }
    }

    private async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken token)
    {
        try
        {
            return await timer.WaitForNextTickAsync(token);
        }
        catch (OperationCanceledException ex)
        {
            // Expected on shutdown: returning false ends the loop. Log only the type, at debug level.
            log.LogDebug("Game clock stopped: {ExceptionType}.", ex.GetType().Name);

            return false;
        }
    }

    // One bad tick (for example a version conflict) must not kill the clock.
    private async Task TickSafelyAsync()
    {
        try
        {
            await clock.TickAsync();
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Game clock tick failed.");
        }
    }
}
