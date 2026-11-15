namespace SpaceGame.Server.Persistence;

public sealed class GameRow
{
    public Guid Id { get; set; }
    public string Code { get; set; } = "";
    public string Status { get; set; } = "lobby";
    public string Mode { get; set; } = "week";
    public int Seed { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public string Config { get; set; } = "{}";
    public string State { get; set; } = "{}";
    public long Version { get; set; }
    public string? DiscordWebhook { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class PlayerRow
{
    public Guid Id { get; set; }
    public Guid GameId { get; set; }
    public string Name { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public bool IsHost { get; set; }
}

public sealed class ReportRow
{
    public Guid Id { get; set; }
    public Guid GameId { get; set; }
    public long GameTime { get; set; }
    public string Kind { get; set; } = "";
    public string Payload { get; set; } = "{}";
}
