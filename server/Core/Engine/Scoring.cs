namespace SpaceGame.Core;

/// <summary>Points: 1 per game hour for every held objective, and 1 on capturing one.</summary>
public static class Scoring
{
    private const long SecondsPerHour = GameSeconds.Hour;
    private const int CapturePoints = 1;

    /// <summary>Records a capture: always a PlanetCaptured event, and a point when the planet is an objective.</summary>
    public static GameState Capture(GameState state, Side side, PlanetId planet, long atSeconds, PlayerId? by = null)
    {
        var points = state.Objectives.Contains(planet) ? CapturePoints : 0;
        var captured = new GameEvent(atSeconds, "PlanetCaptured", new Dictionary<string, string>
        {
            ["side"] = side.ToString(),
            ["planet"] = planet.Value,
            ["points"] = points.ToString(),
        });

        var scored = Credit(Add(state, side, points), by, points);
        var events = new List<GameEvent> { captured };

        if (points > 0) events.Add(ScoreEvent(scored, atSeconds));

        scored = Endgame.CheckScore(scored, atSeconds, events);

        return scored with { PendingEvents = [.. scored.PendingEvents, .. events] };
    }

    /// <summary>Moves events made outside Advance into this Advance's event list.</summary>
    public static GameState Drain(GameState state, List<GameEvent> events)
    {
        events.AddRange(state.PendingEvents);

        return state with { PendingEvents = [] };
    }

    /// <summary>Scores every full game hour up to now, using who holds each objective at the end of the advance.</summary>
    public static GameState ScoreHours(GameState state, long nowSeconds, List<GameEvent> events)
    {
        var result = state;
        var team = state.Objectives.Count(planet => state.Players.Any(p => p.HoldingAt(planet) is not null));
        var enemy = state.Objectives.Count(state.EnemyPlanets.Contains);
        var last = Math.Min(nowSeconds, state.Config.WeekSeconds);

        while (result.Outcome is null && (result.HoursScored + 1) * SecondsPerHour <= last)
        {
            var hourEnds = (result.HoursScored + 1) * SecondsPerHour;
            result = Add(Add(result, Side.Team, team), Side.Enemy, enemy) with { HoursScored = result.HoursScored + 1 };
            result = CreditHeld(result);

            if (team + enemy > 0) events.Add(ScoreEvent(result, hourEnds));

            result = Endgame.CheckScore(result, hourEnds, events);
        }

        return result;
    }

    // Each player earns one point per objective their base holds.
    private static GameState CreditHeld(GameState state) =>
        state with
        {
            Players = [.. state.Players.Select(p => p with { Points = p.Points + state.Objectives.Count(o => p.HoldingAt(o) is not null) })],
        };

    private static GameState Credit(GameState state, PlayerId? player, int points)
    {
        var known = player is { } id ? state.PlayerById(id) : null;

        return known is null ? state : state.WithPlayer(known with { Points = known.Points + points });
    }

    private static GameState Add(GameState state, Side side, int points) =>
        side == Side.Team ? state with { TeamScore = state.TeamScore + points } : state with { EnemyScore = state.EnemyScore + points };

    private static GameEvent ScoreEvent(GameState state, long atSeconds) =>
        new(atSeconds, "ScoreChanged", new Dictionary<string, string>
        {
            ["teamScore"] = state.TeamScore.ToString(),
            ["enemyScore"] = state.EnemyScore.ToString(),
        });
}
