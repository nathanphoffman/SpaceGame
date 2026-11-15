# server tasks (round 4)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Core is still being built in parallel: depend only on the `IGameEngine` interface and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] End-to-end check with the real engine: a test that creates a game, joins two players, starts, sends commands and runs the clock with the real `GameEngine` from Core (not the fake) over the test database, to find contract mismatches. Fix mismatches on the server side; list Core-side ones as requests in CONTRACTS.md.
- [ ] Outcome payload: when Core's `GameEnded` event data (`winner`, `reason`, `teamScore`, `enemyScore`, `contributions`) is missing or malformed, the outcome endpoint should return a clear value, not a 500. Tests with the fake.
- [ ] Discord alerts: tests for the `FleetSpotted` webhook message (target, arrival time, strength), optional webhook per game, and that a failing webhook never breaks a command or logs the URL.
- [ ] Join and start rules: tests that more than 8 players, a duplicate name, joining after start and a non-host start are all refused with ProblemDetails; share link and code returned on create.
- [ ] Docs: add the HTTP endpoints list and the run steps (docker compose, env variables, test-mode game) to the server README section.
