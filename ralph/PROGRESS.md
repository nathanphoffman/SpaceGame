# Progress

Written by the planning step after every round.

## Round 1
Code-quality score (`codequality . --quick`): **87.4** (floor 90 not met; round 2 starts with quality items in every area).

- **core**: resources and catalog, dice `BattleResolver`, `server/Sim`, `TravelRules`, mine output and `Stockpile`, build queues for buildings and ships, upgrades, and a real `GameEngine` with the starting kit and a JSON round-trip test. Earth is still a placeholder planet; no galaxy, fleets, enemy or scoring yet.
- **server**: host, `IClock`, ProblemDetails, OpenAPI written on build, EF Core and Npgsql persistence with optimistic concurrency, create/join/lobby/start, `GameSession` with per-game lock, map/state/quote endpoints, commands endpoint. Missing: reports endpoints, clock service, SignalR hub, Discord alerts.
- **web**: Orval/Zod/TanStack/SignalR dependencies, `client.ts`, `session.ts`, `QueryClientProvider`, `useGameEvents`, `/new` home page, lobby page, map adapters, fleet flight/prep countdown/enemy colour. The generated client was committed at merge (the gen:api item was blocked on openapi.json in round 1).
- **blocked**: none. `npm run build` sometimes fails once with a Next.js SecurityFatalError notice and passes on retry (flaky, left for the user).
- **failed to merge**: nothing (conflicts only in DECISIONS.md, .codequalityignore, Directory.Build.props; glue fixes were applied).

## Milestones
- [~] a. Rules in C# (Core): partial-to-done. Catalog, resolver, simulator are done; `Sim` exists. Balance use comes in j.
- [ ] b. World (Core): not started (no galaxy generation, Earth is a placeholder).
- [~] c. Economy and building (Core): partial. Mines, stockpile, queues, upgrades, Apply/Advance done; `CancelQueueItem` and wiring to real planets missing.
- [ ] d. Fleets (Core): not started.
- [ ] e. Enemy and endgame (Core): not started.
- [~] f. Server: partial. Lobby, persistence, session, map/state/quote/commands done; reports, clock service, SignalR, Discord missing.
- [~] g. Client plumbing (web): partial. Client, session, providers, live hook, lobby, `/new` done with hand-written fetches; generated hooks not yet used, `/` is still the old page.
- [ ] h. Game UI (web): not started (adapters and fleet drawing only).
- [ ] i. Cleanup: not started.
- [ ] j. Balance and polish: not started.
