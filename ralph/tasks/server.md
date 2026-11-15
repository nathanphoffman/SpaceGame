# server tasks (round 1)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`. Core is still being built in parallel: depend only on the `IGameEngine` interface and stubs from round 0, and test against a hand-written fake engine in `Server.Tests`.

- [ ] ASP.NET Core host (minimal APIs, `net10.0`): `Program.cs` with DI, `IClock` (real and fake), `ProblemDetails` error handling, a health endpoint, and OpenAPI document generation that writes `server/openapi.json` on build (Microsoft.AspNetCore.OpenApi + Microsoft.Extensions.ApiDescription.Server). Commit the generated file. A test that the document lists every endpoint from CONTRACTS.md.
- [ ] EF Core + Npgsql persistence per CONTRACTS.md: `games`, `players`, `reports` tables, migrations, a `GameRepository` that loads and saves the state as JSONB with optimistic concurrency on `version`. Postgres-tagged tests (skip without `SPACEGAME_TEST_PG`), including a concurrent-save conflict.
- [ ] Create, join and lobby endpoints: `POST /api/games`, `POST /api/games/join`, `GET .../lobby`, `POST .../start` (host only, max 8 players, join only before start). Join codes are short and easy to type (no 0/O/1/I). Player tokens are random and stored hashed; a bearer-token auth handler. Tests for each rule.
- [ ] `GameSession` service: one per active game, with a per-game lock; loads the state, runs `Advance` up to the game time from `IClock` and `TimeScale`, saves, returns events. Used by every request and by the clock service. Tests with the fake clock and fake engine, including the 1-hour test mode scale.
- [ ] `GET .../map`, `GET .../state` and `POST .../quote` endpoints on top of `GameSession` (auth checked, game id checked against the token). Tests with the fake engine.
- [ ] `POST .../commands`: parse the command JSON (all command types in CONTRACTS.md, strict validation, unknown types rejected), call `Apply`, save, return `CommandResult`. Tests for each command type and each rejection.
