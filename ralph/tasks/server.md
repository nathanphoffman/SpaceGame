# server tasks (round 5)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Core is still being built in parallel: depend only on the `IGameEngine` interface and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 90.0. Flatten long call chains in `Server.Tests` (e.g. `DiscordSessionTests.SetUpAsync`) with small direct fixtures, split test folders and files with more than 6 items/functions where reasonable. Do not widen `.codequalityignore`.
- [ ] Test-mode full game (milestone j): a test using the real `GameEngine` in test mode (TimeScale 168) with a fake clock: create, join, start, then advance the clock until the game ends; check `GET /outcome` returns winner, reason, scores and contributions, and `GameEnded` is sent over the hub fake exactly once.
- [ ] Hardening: tests that a request with a token from another game, a missing token and a bad command body are refused with ProblemDetails (401/403/400), and that two parallel commands on one game never lose a version (per-game lock).
- [ ] Startup: make sure a fresh `docker compose up` + `dotnet run` works with migrations and prints the URL; add a `/health` endpoint with a test and a line in the README.
