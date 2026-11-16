using SpaceGame.Server.Persistence;

namespace SpaceGame.Server.Lobby;

// Pure validation rules for creating and joining a lobby.
public static class LobbyRules
{
    public static readonly string NameLengthMessage = $"Player name must be 1 to {LobbyService.MaxNameLength} characters.";

    // Returns why the player cannot join this lobby, or null when they can.
    public static string? JoinRefusal(LoadedGame game, IReadOnlyList<PlayerRow> players, string name)
    {
        if (game.Status != LobbyService.LobbyStatus)
        {
            return "That game has already started.";
        }

        if (players.Count >= LobbyService.MaxPlayers)
        {
            return "That game is full.";
        }

        return players.Any(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
            ? "That name is already taken in this game."
            : null;
    }

    // Returns the first problem found with the create request, or null when it is valid.
    public static string? ValidateCreate(CreateGameRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Trim().Length > LobbyService.MaxNameLength)
        {
            return NameLengthMessage;
        }

        if (req.Mode is not (LobbyService.WeekMode or LobbyService.TestMode))
        {
            return "Mode must be \"week\" or \"test\".";
        }

        return IsValidWebhook(req.DiscordWebhookUrl) ? null : "Discord webhook must be an https URL.";
    }

    public static bool IsValidWebhook(string? url) =>
        string.IsNullOrWhiteSpace(url)
        || (Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps);
}
