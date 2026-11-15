using Microsoft.Extensions.DependencyInjection;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameClockTests
{
    private static GameClock NewClock(StoredGame stored, FakeClock time, FakeEngine engine)
    {
        var services = new ServiceCollection();
        services.AddScoped(_ => TestDatabase.NewContext(stored.Schema));
        services.AddScoped<GameRepository>();
        services.AddScoped<GameWriter>();
        services.AddLogging();
        services.AddScoped<GameSession>();
        services.AddSingleton<IGameEngine>(engine);
        services.AddSingleton<IClock>(time);
        services.AddSingleton<GameLocks>();
        services.AddSingleton<IGameNotifier, NullGameNotifier>();
        services.AddSingleton<SpaceGame.Server.Discord.IDiscordNotifier, NoDiscord>();

        return new GameClock(services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>());
    }

    [PostgresFact]
    public async Task A_tick_advances_a_running_game()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var time = new FakeClock(StoredGame.StartTime);
        var clock = NewClock(stored, time, new FakeEngine());
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        Assert.Equal(60, (await stored.Repo.LoadAsync(stored.GameId))!.State.Time);
    }

    [PostgresFact]
    public async Task A_game_in_the_lobby_is_left_alone()
    {
        var stored = await StoredGame.CreateAsync();
        var time = new FakeClock(StoredGame.StartTime);
        var engine = new FakeEngine();
        var clock = NewClock(stored, time, engine);
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        Assert.Equal(0, engine.AdvanceCalls);
    }

    [PostgresFact]
    public async Task An_ended_game_is_not_advanced_again()
    {
        var stored = await StoredGame.CreateAsync(status: "running");
        var time = new FakeClock(StoredGame.StartTime);
        var engine = new FakeEngine { EventKind = EventNotifications.GameEndedKind };
        var clock = NewClock(stored, time, engine);
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        await clock.TickAsync();
        Assert.Equal(1, engine.AdvanceCalls);
    }
}
