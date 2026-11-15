using Microsoft.Extensions.DependencyInjection;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

/// <summary>A game driven by the clock service with the fake engine, until the engine reports GameEnded.</summary>
[Trait("Category", "Postgres")]
public class GameClockEndTests
{
    private static readonly TimeSpan Step = TimeSpan.FromSeconds(60);
    private const int Ticks = 4;

    [PostgresFact]
    public async Task A_game_ended_by_the_clock_stores_its_outcome_and_announces_it_once()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var time = new FakeClock(StoredGame.StartTime);
        var notifier = new RecordingNotifier();
        var engine = new FakeEngine { EventKind = EventNotifications.GameEndedKind };

        var services = new ServiceCollection();
        services.AddScoped(_ => TestDatabase.NewContext(stored.Schema));
        services.AddScoped<GameRepository>();
        services.AddScoped<GameWriter>();
        services.AddLogging();
        services.AddScoped<GameSession>();
        services.AddSingleton<IGameEngine>(engine);
        services.AddSingleton<IClock>(time);
        services.AddSingleton<GameLocks>();
        services.AddSingleton<IGameNotifier>(notifier);
        services.AddSingleton<SpaceGame.Server.Discord.IDiscordNotifier, NoDiscord>();
        var clock = new GameClock(services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>());

        for (var i = 0; i < Ticks; i++)
        {
            time.MoveForward(Step);
            await clock.TickAsync();
        }

        Assert.Equal(1, engine.AdvanceCalls);
        Assert.Single(notifier.GameEndedOutcomes);
        var outcome = await stored.Repo.OutcomeAsync(stored.GameId);
        Assert.NotNull(outcome);
    }
}
