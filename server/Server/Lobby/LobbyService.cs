using SpaceGame.Core;
using SpaceGame.Server.Auth;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Lobby;

public sealed class LobbyService(GameRepository repo, GameWriter writer, IGameEngine engine, IClock clock, ILogger<LobbyService> log)
{
    public const int MaxPlayers = 8;
    public const int MaxNameLength = 30;
    public const string WeekMode = "week";
    public const string TestMode = "test";
    public const string LobbyStatus = "lobby";
    public const string RunningStatus = "running";
    public const string FinishedStatus = "finished";
    public const string GameNotFound = "Game not found.";

    public async Task<ServiceResult<CreateGameResponse>> CreateAsync(CreateGameRequest req)
    {
        var error = ValidateCreate(req);

        if (error is not null)
        {
            return ServiceResult<CreateGameResponse>.Fail(StatusCodes.Status400BadRequest, error);
        }

        var seed = req.Seed ?? Random.Shared.Next();
        var playerId = Guid.NewGuid();
        var state = engine.NewGame(SetupFor(seed, [new PlayerSetup(new PlayerId(playerId.ToString()), req.Name!.Trim())]));
        var game = await writer.CreateAsync(await FreeCodeAsync(), req.Mode!, seed, state, req.DiscordWebhookUrl, clock.UtcNow);
        var token = await AddHostAsync(game.Id, playerId, req.Name!.Trim());

        return ServiceResult<CreateGameResponse>.Success(new(game.Id, game.Code, playerId, token));
    }

    // Validates the name, finds the lobby by code, checks it is open and not full, then adds the player.
    public async Task<ServiceResult<JoinGameResponse>> JoinAsync(JoinGameRequest req)
    {
        var name = req.PlayerName?.Trim() ?? "";

        if (name.Length is 0 or > MaxNameLength)
        {
            return ServiceResult<JoinGameResponse>.Fail(StatusCodes.Status400BadRequest, "Player name must be 1 to 30 characters.");
        }

        var game = await repo.LoadByCodeAsync(JoinCodes.Normalize(req.Code));

        if (game is null)
        {
            return ServiceResult<JoinGameResponse>.Fail(StatusCodes.Status404NotFound, "No game has that code.");
        }

        if (game.Status != LobbyStatus)
        {
            return ServiceResult<JoinGameResponse>.Fail(StatusCodes.Status409Conflict, "That game has already started.");
        }

        if ((await repo.PlayersAsync(game.Id)).Count >= MaxPlayers)
        {
            return ServiceResult<JoinGameResponse>.Fail(StatusCodes.Status409Conflict, "That game is full.");
        }

        var playerId = Guid.NewGuid();
        var token = await AddGuestAsync(game.Id, playerId, name);

        return ServiceResult<JoinGameResponse>.Success(new(game.Id, playerId, token));
    }

    public async Task<ServiceResult<LobbyResponse>> LobbyAsync(Guid gameId)
    {
        var game = await repo.LoadAsync(gameId);

        if (game is null)
        {
            return ServiceResult<LobbyResponse>.Fail(StatusCodes.Status404NotFound, GameNotFound);
        }

        var players = (await repo.PlayersAsync(gameId)).Select(p => new LobbyPlayer(p.Id, p.Name, p.IsHost)).ToList();

        return ServiceResult<LobbyResponse>.Success(new(game.Code, game.Mode, game.Status != LobbyStatus, players));
    }

    // Only the host can start; the game is saved with a version check so a parallel change gives a 409.
    public async Task<ServiceResult<bool>> StartAsync(Guid gameId, PlayerIdentity caller)
    {
        if (!caller.IsHost)
        {
            return ServiceResult<bool>.Fail(StatusCodes.Status403Forbidden, "Only the host can start the game.");
        }

        var game = await repo.LoadAsync(gameId);

        if (game is null)
        {
            return ServiceResult<bool>.Fail(StatusCodes.Status404NotFound, GameNotFound);
        }

        if (game.Status != LobbyStatus)
        {
            return ServiceResult<bool>.Fail(StatusCodes.Status409Conflict, "The game has already started.");
        }

        var players = (await repo.PlayersAsync(gameId)).Select(p => new PlayerSetup(new PlayerId(p.Id.ToString()), p.Name)).ToList();
        var state = engine.NewGame(SetupFor(game.Seed, players));

        return await SaveStartedAsync(game, state);
    }

    private async Task<ServiceResult<bool>> SaveStartedAsync(LoadedGame game, GameState state)
    {
        try
        {
            await writer.SaveAsync(game.Id, state, RunningStatus, game.Version, clock.UtcNow, startedAt: clock.UtcNow);

            return ServiceResult<bool>.Success(true);
        }
        catch (VersionConflictException ex)
        {
            // Expected when two requests race: the loser gets a 409 and retries, so we log only the type.
            log.LogInformation("Start lost a race for game {GameId}: {ExceptionType}.", game.Id, ex.GetType().Name);

            return ServiceResult<bool>.Fail(StatusCodes.Status409Conflict, "The game was changed at the same time. Try again.");
        }
    }

    // Returns the first problem found with the create request, or null when it is valid.
    private static string? ValidateCreate(CreateGameRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Trim().Length > MaxNameLength)
        {
            return "Player name must be 1 to 30 characters.";
        }

        if (req.Mode is not (WeekMode or TestMode))
        {
            return "Mode must be \"week\" or \"test\".";
        }

        return IsValidWebhook(req.DiscordWebhookUrl) ? null : "Discord webhook must be an https URL.";
    }

    private static bool IsValidWebhook(string? url) =>
        string.IsNullOrWhiteSpace(url)
        || (Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps);

    private static GameSetup SetupFor(int seed, IReadOnlyList<PlayerSetup> players)
    {
        return new GameSetup(seed, players, new GameConfig());
    }

    private async Task<string> FreeCodeAsync()
    {
        while (true)
        {
            var code = JoinCodes.New();

            if (await repo.LoadByCodeAsync(code) is null)
            {
                return code;
            }
        }
    }

    private Task<string> AddHostAsync(Guid gameId, Guid playerId, string name) =>
        SavePlayerAsync(new PlayerRow { Id = playerId, GameId = gameId, Name = name, IsHost = true });

    private Task<string> AddGuestAsync(Guid gameId, Guid playerId, string name) =>
        SavePlayerAsync(new PlayerRow { Id = playerId, GameId = gameId, Name = name, IsHost = false });

    private async Task<string> SavePlayerAsync(PlayerRow player)
    {
        var token = PlayerTokens.NewToken();
        player.TokenHash = PlayerTokens.Hash(token);
        await writer.AddPlayerAsync(player);

        return token;
    }
}
