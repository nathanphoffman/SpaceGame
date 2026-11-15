# server tasks (round 6)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Depend only on `IGameEngine` and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 89.9. In `Server.Tests` (11 items, `Api` has 12) move files into subfolders of about 6, and flatten call chains (`DiscordSessionTests`, `GameSessionTests` has 13 tests: split it). Do not widen `.codequalityignore`.
- [ ] Quality: in `GameOutcome.cs` the two swallowed catches (lines ~37 and ~55) should log a warning (ILogger) while still falling back to "unknown"; add a test that checks the fallback and the log.
- [ ] Restart safety: a test that creates and starts a game, drops the session cache (new `GameSession`/host on the same database), and checks state, clock and `Advance` carry on from the persisted version without losing events.
- [ ] Docs: README section on test mode (TimeScale 168, 1-hour game), the Discord webhook setting and the `/health` and `/outcome` endpoints, checked against the code.
