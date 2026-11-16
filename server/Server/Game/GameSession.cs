using System.Collections.Concurrent;
using SpaceGame.Core;
using SpaceGame.Server.Discord;
using SpaceGame.Server.Lobby;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Game;

/// <summary>A game after it was advanced to "now": its state, version, game time and the events that happened.</summary>
public sealed record GameSnapshot(LoadedGame Game, long GameTime, IReadOnlyList<GameEvent> Events);

/// <summary>One lock per game id, shared by all requests and the clock service.</summary>
public sealed class GameLocks
{
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> locks = new();

    public SemaphoreSlim For(Guid gameId) => locks.GetOrAdd(gameId, _ => new SemaphoreSlim(1, 1));
}

/// <summary>Maps real time to game time: 1 game second per real second in week mode, 168 in the 1-hour test mode.</summary>
public static class TimeScale
{
    public const int WeekScale = 1;
    public const int TestScale = 168;

    public static int For(string mode) => mode == LobbyService.TestMode ? TestScale : WeekScale;

    public static long GameTime(DateTimeOffset startedAt, DateTimeOffset now, string mode, long weekSeconds)
    {
        var elapsed = (long)Math.Floor((now - startedAt).TotalSeconds) * For(mode);

        return Math.Clamp(elapsed, 0, weekSeconds);
    }
}

/// <summary>Dice that are reproducible from a seed and the game time they are rolled for.</summary>
public sealed class SeededDice(int seed, long gameTime) : IDice
{
    private const int DieSides = 6;

    private readonly Random random = new(HashCode.Combine(seed, gameTime));

    public int Roll() => random.Next(1, DieSides + 1);
}

/// <summary>Loads a game, advances it to the current game time, saves it and hands it to the caller, all under the game's lock.</summary>
public sealed class GameSession(GameRepository repo, GameWriter writer, IGameEngine engine, IClock clock, GameLocks locks, IGameNotifier notifier, IDiscordNotifier discord, ILogger<GameSession> log)
{
    /// <summary>Returns null when the game does not exist.</summary>
    public Task<GameSnapshot?> AdvanceAsync(Guid gameId) =>
        MutateAsync<object?>(gameId, (_, _) => null);

    /// <summary>
    /// Advances the game, lets <paramref name="change"/> return a changed state (or null for no change) and saves once.
    /// The callback gets the advanced state and the game time.
    /// </summary>
    public async Task<GameSnapshot?> MutateAsync<T>(Guid gameId, Func<GameState, long, (GameState State, T Value)?> change)
    {
        var gate = locks.For(gameId);
        await gate.WaitAsync();

        try
        {
            return await RunLockedAsync(gameId, change);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<GameSnapshot?> RunLockedAsync<T>(Guid gameId, Func<GameState, long, (GameState State, T Value)?> change)
    {
        var game = await repo.LoadAsync(gameId);

        if (game is null)
        {
            return null;
        }

        if (game.Status == LobbyService.FinishedStatus)
        {
            return new GameSnapshot(game, game.State.Time, []);
        }

        if (game.Status != LobbyService.RunningStatus || game.StartedAt is null)
        {
            return new GameSnapshot(game, 0, []);
        }

        var now = TimeScale.GameTime(game.StartedAt.Value, clock.UtcNow, game.Mode, game.State.Config.WeekSeconds);
        var (state, events) = engine.Advance(game.State, now, new SeededDice(game.Seed, now));
        var ended = events.Any(e => e.Kind == EventNotifications.GameEndedKind);
        var status = ended ? LobbyService.FinishedStatus : game.Status;

        // A command that arrives in the same tick the game ends is not applied: the game is over.
        var changed = ended ? null : change(state, now);
        state = changed?.State ?? state;

        if (state == game.State && !ended)
        {
            return new GameSnapshot(game, now, events);
        }

        var version = await writer.SaveAsync(game.Id, state, status, game.Version, clock.UtcNow);
        var reports = await SaveReportsAsync(game.Id, events);

        // Saving a pure clock advance must not tell clients to refetch: a refetch advances and saves again, which loops forever.
        if (ended || changed is not null || events.Count > 0)
        {
            await EventNotifications.PublishAsync(notifier, game.Id, version, events, reports);
        }

        await DiscordAlerts.SendAsync(discord, game.DiscordWebhook, events);

        return new GameSnapshot(game with { State = state, Version = version, Status = status }, now, events);
    }

    private async Task<IReadOnlyList<ReportRow>> SaveReportsAsync(Guid gameId, IReadOnlyList<GameEvent> events)
    {
        var rows = ReportRecorder.RowsFor(gameId, events);

        if (OutcomeRecorder.RowFor(gameId, events, log) is { } outcome)
        {
            await writer.AddReportsAsync([outcome]);
        }

        if (rows.Count > 0)
        {
            await writer.AddReportsAsync(rows);
        }

        return rows;
    }
}
