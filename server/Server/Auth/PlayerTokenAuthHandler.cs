using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Auth;

public static class PlayerAuth
{
    public const string Scheme = "PlayerToken";
    public const string GameIdClaim = "game_id";
    public const string HostClaim = "is_host";
    public const string HubPath = "/hubs";
    private const string BearerPrefix = "Bearer ";

    public static string? ReadBearer(string? header) =>
        header is not null && header.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase)
            ? header[BearerPrefix.Length..].Trim()
            : null;
}

/// <summary>Reads "Authorization: Bearer token", looks the hash up and signs in the player.</summary>
public sealed class PlayerTokenAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    GameRepository games) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    // Browsers cannot set headers on WebSocket connections, so the hub takes the token from the query.
    private string? HubQueryToken() =>
        Request.Path.StartsWithSegments(PlayerAuth.HubPath) ? Request.Query["access_token"].ToString() : null;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = PlayerAuth.ReadBearer(Request.Headers.Authorization.ToString()) ?? HubQueryToken();

        if (string.IsNullOrEmpty(token))
        {
            return AuthenticateResult.NoResult();
        }

        var player = await games.PlayerByTokenHashAsync(PlayerTokens.Hash(token));

        if (player is null)
        {
            return AuthenticateResult.Fail("Unknown token.");
        }

        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, player.Id.ToString()),
            new(PlayerAuth.GameIdClaim, player.GameId.ToString()),
            new(PlayerAuth.HostClaim, player.IsHost.ToString()),
        ];

        var identity = new ClaimsIdentity(claims, PlayerAuth.Scheme);

        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), PlayerAuth.Scheme));
    }
}

/// <summary>The signed-in player, read from the claims.</summary>
public sealed record PlayerIdentity(Guid PlayerId, Guid GameId, bool IsHost)
{
    public static PlayerIdentity? From(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var game = user.FindFirstValue(PlayerAuth.GameIdClaim);

        if (!Guid.TryParse(id, out var playerId) || !Guid.TryParse(game, out var gameId))
        {
            return null;
        }

        return new PlayerIdentity(playerId, gameId, user.FindFirstValue(PlayerAuth.HostClaim) == bool.TrueString);
    }
}
