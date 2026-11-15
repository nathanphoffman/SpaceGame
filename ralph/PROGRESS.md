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

## Round 4
Code-quality score (`codequality . --quick`): **90.0** (down 0.6 from 90.6, floor met but only just; weakest rules: call depth in tests, "Minimize dependencies" 67%, "Simple beats clever" 80%). `ralph/check_full.sh` passes.

- **core**: enemy attacks (`EnemyAttack`), Earth attack schedule, scoring, endgame (`GameEnded` with the keys the server reads), world checks, full-week determinism test, balance run with `server/Sim` (no config change). Core rules are all in.
- **server**: end-to-end test with the real engine, outcome payload fallbacks, Discord session tests, lobby rules tests, README endpoints and run steps. Only the old TS server deletion is left.
- **web**: generated Zod swap, outcome from `GET /outcome`, live-update checks, lobby polish, score bars, README and `npm run play`. Only the legacy deletion is left.
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests needs the user's OK (the user's rule is to ask before deleting). Milestone i and the "old server gone" Done item cannot finish until then. Deleting them would also lift the dependency score.
- **failed to merge**: nothing. Two glue fixes after merge (Core `Map` fills systems, CORS for localhost:3000).

## Round 5
Code-quality score (`codequality . --quick`): **89.9** (down 0.1 from 90.0, just under the 90 floor; round 6 starts with quality items). Weakest: call depth in tests (235 of 471 entry points over 6), "Minimize dependencies" 68% (old TS server deps), test count far above the ideal (370 vs 139, only fixed by deleting dead code, not tests).

- **core**: quality passes (renamed clashing helper names, FleetBattles and test files split into partials/subfolders), Sim `--weapons` flag, balance numbers in DECISIONS (no config change), `FleetView.SightHops`, `Reason` on every enemy order plus `EnemyOrder` events.
- **server**: Discord test fixture, test-mode full game on the real engine, hardening tests (wrong-game token, bad body, parallel commands), startup/health/README.
- **web**: components/game and lib/api regrouped into subfolders, game page loading/not-found/error states, reconnect end-to-end test, how-to-play panel and Escape to close, narrow-screen CSS and top-bar tests. Scout range hint not drawn yet (SightHops now exists).
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests still needs the user's OK. Milestone i and the "old server gone" Done item stay open until then. It would also lift the dependency score.
- **failed to merge**: nothing. One glue fix (regenerate the API client after core's `SightHops`).
- `npm run build` still prints a Next.js security-advisory stop on the first run and passes on retry; round 6 web has an item to upgrade Next.
- Full checks were not run in the planning step because milestone i and the quality floor are not met, so the game is not complete.

## Milestones
- [x] a. Rules in C# (Core): done; Sim used for the balance pass.
- [x] b. World (Core): done, travel and objective tests exist.
- [x] c. Economy and building (Core): done.
- [x] d. Fleets (Core): done.
- [x] e. Enemy and endgame (Core): done.
- [x] f. Server: done; real-engine end-to-end test passes.
- [x] g. Client plumbing (web): done, generated Zod in use.
- [~] h. Game UI (web): all panels done; `SightHops` is available but the scout range hint is not drawn; live wiring only tested with a fake hub.
- [~] i. Cleanup: README and `npm run play` done; deleting the old TS server and legacy UI blocked on the user's OK.
- [~] j. Balance and polish: balance run done; server test-mode full game test done; docs polish and a final test-mode play-through note left.
