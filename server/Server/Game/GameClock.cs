using Microsoft.Extensions.DependencyInjection;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>Advances every running game once per tick and remembers the games that ended so it leaves them alone.</summary>
public sealed class GameClock(IServiceScopeFactory scopes)
{
    public const string GameEndedKind = "GameEnded";

    private readonly HashSet<Guid> ended = [];

    public async Task TickAsync()
    {
        await using var scope = scopes.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<GameRepository>();
        var session = scope.ServiceProvider.GetRequiredService<GameSession>();

        foreach (var id in await repo.RunningGameIdsAsync())
        {
            if (!ended.Contains(id))
            {
                await AdvanceOneAsync(session, id);
            }
        }
    }

    private async Task AdvanceOneAsync(GameSession session, Guid id)
    {
        var snapshot = await session.AdvanceAsync(id);

        if (snapshot is not null && snapshot.Events.Any(e => e.Kind == GameEndedKind))
        {
            ended.Add(id);
        }
    }
}

/// <summary>Calls <see cref="GameClock.TickAsync"/> on a timer so the world moves with nobody calling.</summary>
public sealed class GameClockService(GameClock clock, ILogger<GameClockService> log) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        while (await WaitAsync(timer, stoppingToken))
        {
            await TickSafelyAsync();
        }
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken token)
    {
        try
        {
            return await timer.WaitForNextTickAsync(token);
        }
        catch (OperationCanceledException)
        {
            // Expected on shutdown: returning false ends the loop, so there is nothing to log.
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
