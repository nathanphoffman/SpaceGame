namespace SpaceGame.Server.Persistence;

public sealed class GameRow
{
    public Guid Id { get; set; }
    public string Code { get; set; } = "";
    public string Status { get; set; } = "lobby";
    public string Mode { get; set; } = "week";
    public int Seed { get; set; }
    public long Version { get; set; }
    public string? DiscordWebhook { get; set; }
    public GameJson Json { get; set; } = new();
    public GameTimes Times { get; set; } = new();
}

/// <summary>The two JSONB columns of a game (stored in the games table itself).</summary>
public sealed class GameJson
{
    public string Config { get; set; } = "{}";
    public string State { get; set; } = "{}";
}

/// <summary>The timestamp columns of a game (stored in the games table itself).</summary>
public sealed class GameTimes
{
    public DateTimeOffset? StartedAt { get; set; }
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
