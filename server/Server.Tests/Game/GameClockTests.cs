using Microsoft.Extensions.DependencyInjection;
using SpaceGame.Core;
using SpaceGame.Server.Game;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Tests;

[Trait("Category", "Postgres")]
public class GameClockTests
{
    private static readonly DateTimeOffset Start = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private static async Task<(GameClock Clock, FakeClock Time, FakeEngine Engine, GameRepository Repo, Guid Id)> SetupAsync(string status)
    {
        var schema = await TestDatabase.MigratedSchemaAsync();
        var time = new FakeClock(Start);
        var engine = new FakeEngine();
        var services = new ServiceCollection();
        services.AddScoped(_ => TestDatabase.NewContext(schema));
        services.AddScoped<GameRepository>();
        services.AddScoped<GameSession>();
        services.AddSingleton<IGameEngine>(engine);
        services.AddSingleton<IClock>(time);
        services.AddSingleton<GameLocks>();
        services.AddSingleton<IGameNotifier, NullGameNotifier>();
        services.AddSingleton<SpaceGame.Server.Discord.IDiscordNotifier, NoDiscord>();
        var provider = services.BuildServiceProvider();
        var repo = provider.GetRequiredService<GameRepository>();
        var row = await repo.CreateAsync("ABCD", "week", 1, new GameState(new GameConfig(), 0), null, Start);
        await repo.SaveAsync(row.Id, new GameState(new GameConfig(), 0), status, 0, Start, Start);

        return (new GameClock(provider.GetRequiredService<IServiceScopeFactory>()), time, engine, repo, row.Id);
    }

    [PostgresFact]
    public async Task A_tick_advances_a_running_game()
    {
        var (clock, time, _, repo, id) = await SetupAsync("running");
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        Assert.Equal(60, (await repo.LoadAsync(id))!.State.Time);
    }

    [PostgresFact]
    public async Task A_game_in_the_lobby_is_left_alone()
    {
        var (clock, time, engine, _, _) = await SetupAsync("lobby");
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        Assert.Equal(0, engine.AdvanceCalls);
    }

    [PostgresFact]
    public async Task An_ended_game_is_not_advanced_again()
    {
        var (clock, time, engine, _, _) = await SetupAsync("running");
        engine.EventKind = GameClock.GameEndedKind;
        time.Advance(TimeSpan.FromSeconds(60));
        await clock.TickAsync();
        await clock.TickAsync();
        Assert.Equal(1, engine.AdvanceCalls);
    }
}
