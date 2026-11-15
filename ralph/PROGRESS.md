# Progress

Written by the planning step after every round.

## Round 1
Code-quality score (`codequality . --quick`): **87.4** (floor 90 not met; round 2 starts with quality items in every area).

- **core**: resources and catalog, dice `BattleResolver`, `server/Sim`, `TravelRules`, mine output and `Stockpile`, build queues for buildings and ships, upgrades, and a real `GameEngine` with the starting kit and a JSON round-trip test. Earth is still a placeholder planet; no galaxy, fleets, enemy or scoring yet.
- **server**: host, `IClock`, ProblemDetails, OpenAPI written on build, EF Core and Npgsql persistence with optimistic concurrency, create/join/lobby/start, `GameSession` with per-game lock, map/state/quote endpoints, commands endpoint. Missing: reports endpoints, clock service, SignalR hub, Discord alerts.
- **web**: Orval/Zod/TanStack/SignalR dependencies, `client.ts`, `session.ts`, `QueryClientProvider`, `useGameEvents`, `/new` home page, lobby page, map adapters, fleet flight/prep countdown/enemy colour. The generated client was committed at merge (the gen:api item was blocked on openapi.json in round 1).
- **blocked**: none. `npm run build` sometimes fails once with a Next.js SecurityFatalError notice and passes on retry (flaky, left for the user).
- **failed to merge**: nothing (conflicts only in DECISIONS.md, .codequalityignore, Directory.Build.props; glue fixes were applied).

## Round 2
Code-quality score (`codequality . --quick`): **88.7** (up from 87.4, still under 90; round 3 starts with quality items in every area). Worst: call depth in tests, short names, magic numbers, too many functions per test file, missing comments on complex code.

- **core**: folders regrouped, big test classes split, world catalog (~24 systems), `GalaxyGenerator`, real galaxy in `NewGame` (Earth holdings, enemy home, objectives), real travel distances, `PlayerView` own planets and holdings, `CancelQueueItem`, fleets part 1 (send, recall, flight, arrival, parking). Not done: battles at arrival, colonize, trade, visibility.
- **server**: test folders, `GameRow` complex types, `CommandBody` split, reports endpoints, clock service, SignalR hub, Discord alerts. Not done: game end handling.
- **web**: quality passes, generated client in forms and lobby, `/` home page, game page shell with top bar and maps, planet and building panel, ship and upgrade buttons. Not done: queue list and cancel, fleet send dialog.
- **blocked**: web's generated-Zod swap is unblocked now (the merge added response schemas to the OpenAPI file).
- **failed to merge**: nothing. The merge needed one glue fix (declare `Produces<T>` in the API and regenerate the client).

## Milestones
- [~] a. Rules in C# (Core): partial-to-done. Catalog, resolver and `server/Sim` exist; balance use comes in j.
- [~] b. World (Core): mostly done. Catalog, generator, real galaxy in `NewGame`, real distances. No dedicated check of the 1 to 2 day enemy trip beyond the quote tuning.
- [x] c. Economy and building (Core): done (mines, stockpile, queues, upgrades, cancel, Apply/Advance).
- [~] d. Fleets (Core): partial. Send, recall, flight, arrival done; battles, colonize, trade, visibility not started.
- [ ] e. Enemy and endgame (Core): not started.
- [~] f. Server: partial. Lobby, persistence, session, endpoints, reports, clock, SignalR, Discord done; game end handling and outcome data missing.
- [~] g. Client plumbing (web): mostly done. Generated client in forms and lobby, `/` home page; adapters still use hand-written Zod.
- [~] h. Game UI (web): partial. Top bar, maps, planet and building panel, queue and upgrade buttons; no queue list, send dialog, warnings, reports, trade, end screen.
- [ ] i. Cleanup: not started (`lib/server`, `app/api`, old defs and `/legacy` still exist).
- [ ] j. Balance and polish: not started.
