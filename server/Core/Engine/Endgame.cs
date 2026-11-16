using System.Text.Json;
using System.Text.Json.Serialization;

namespace SpaceGame.Core;

/// <summary>How the game ended.</summary>
/// <param name="Reason">One of score, time, homeCaptured, earthLost.</param>
public sealed record GameOutcome(Side Winner, string Reason, long At);

/// <summary>One player's share of the team score, as written into the GameEnded event.</summary>
public sealed record Contribution([property: JsonPropertyName("player")] string Player, [property: JsonPropertyName("points")] int Points);

/// <summary>Decides when the game is over and writes the GameEnded event.</summary>
public static class Endgame
{
    public const string ScoreReason = "score";
    public const string TimeReason = "time";
    public const string HomeCapturedReason = "homeCaptured";
    public const string EarthLostReason = "earthLost";

    /// <summary>Ends the game (once) and adds the GameEnded event.</summary>
    public static GameState End(GameState state, Side winner, string reason, long atSeconds, List<GameEvent> events)
    {
        if (state.Outcome is not null) return state;

        var contributions = state.Players.Select(p => new Contribution(p.Id.Value, p.Points));

        events.Add(new GameEvent(atSeconds, EventNames.GameEnded, new Dictionary<string, string>
        {
            ["winner"] = winner.ToString(),
            ["reason"] = reason,
            ["teamScore"] = state.TeamScore.ToString(),
            ["enemyScore"] = state.EnemyScore.ToString(),
            ["contributions"] = JsonSerializer.Serialize(contributions),
        }));

        return state with { Outcome = new GameOutcome(winner, reason, atSeconds) };
    }

    /// <summary>Same as <see cref="End"/> for changes made outside Advance: the event waits in PendingEvents.</summary>
    public static GameState EndPending(GameState state, Side winner, string reason, long atSeconds)
    {
        var events = new List<GameEvent>();
        var ended = End(state, winner, reason, atSeconds, events);

        return ended with { PendingEvents = [.. ended.PendingEvents, .. events] };
    }

    /// <summary>Ends the game when a side has reached the score target; the higher score wins, a tie goes to the enemy.</summary>
    public static GameState CheckScore(GameState state, long atSeconds, List<GameEvent> events)
    {
        var target = state.Config.ScoreTarget;

        if (state.TeamScore < target && state.EnemyScore < target) return state;

        return End(state, Leader(state), ScoreReason, atSeconds, events);
    }

    /// <summary>Ends the game at the end of the week; the higher score wins, a tie goes to the enemy.</summary>
    public static GameState CheckTime(GameState state, long nowSeconds, List<GameEvent> events) =>
        nowSeconds < state.Config.WeekSeconds ? state : End(state, Leader(state), TimeReason, state.Config.WeekSeconds, events);

    private static Side Leader(GameState state) => state.TeamScore > state.EnemyScore ? Side.Team : Side.Enemy;
}
