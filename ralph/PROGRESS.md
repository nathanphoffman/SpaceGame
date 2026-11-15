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

## Round 3
Code-quality score (`codequality . --quick`): **90.6** (up from 88.7, floor met; weakest rule is "Minimize dependencies" at 66%).

- **core**: quality passes, fleets part 2 (battles at arrival, damage and healing, colonize, Hauler trade), visibility with `FleetSpotted` events, enemy AI part 1 (income, garrison, colony expedition). Not done: enemy attacks and Earth schedule, scoring, endgame.
- **server**: split reads/writes in the repository, game end handling, `GET /outcome` endpoint (reads `GameEnded` event data), test-mode clock scale and configurable tick, migrations at start. Nothing outstanding except checking against the real engine.
- **web**: quality pass, queue list with cancel, fleet send dialog with quote and recall, warnings and reports pages, upgrades and trade panels, end screen. Not done: generated-Zod swap (now unblocked by the string-id merge), legacy deletion.
- **blocked**: `[!]` deleting `/legacy`, `lib/server` and `app/api` needs the user's OK (deleting files); web and server items for it stay blocked until the user approves.
- **failed to merge**: nothing. After the merge the web requests were applied (string ids, string `Side`, `PlayerView.Upgrades`).
- `npm run build` still fails once per run with a Next.js security notice and passes on retry (flaky, left for the user).

## Milestones
- [~] a. Rules in C# (Core): catalog, resolver and `server/Sim` exist; balance use comes in j.
- [~] b. World (Core): galaxy, generator, real distances done; no test yet that the enemy trip is 1 to 2 days.
- [x] c. Economy and building (Core): done.
- [~] d. Fleets (Core): send, recall, flight, arrival, battles, colonize, trade, visibility done. Reports exist as events; mostly done.
- [~] e. Enemy and endgame (Core): AI part 1 done; attack choice, Earth schedule, scoring, instant win/loss, week end not started.
- [~] f. Server: done apart from checking `GameEnded` payload against Core's real events.
- [~] g. Client plumbing (web): mostly done; adapters still use hand-written Zod (swap now possible).
- [~] h. Game UI (web): top bar, maps, planet/queue/upgrade/trade panels, send dialog, warnings, reports, end screen done; needs live wiring check.
- [ ] i. Cleanup: not started; blocked on the user's OK to delete files (`lib/server`, `app/api`, `/legacy`, old defs); `npm run play` missing.
- [ ] j. Balance and polish: not started.
