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

## Round 6
Code-quality score (`codequality . --quick`): **89.9** (unchanged from round 5, just under the 90 floor; round 7 starts with quality items). Weakest: call depth (239 of 475 entry points over 6, many from helpers whose names clash with Core methods like `Build`/`Advance`), "Minimize dependencies" 68%, unexplained clever code (58, mostly regex in `ReportViews.tsx`), test count 376 vs 139 expected, one `.Result` in `Core.Tests/Queues/QueueFixture.cs`, 3 plain `<img>`/`<a>` tags.

- **core**: Core.Tests regrouped into subfolders, `Advance` now calls its steps directly, no method over 36 lines, Core README with rule locations, Sim balance check for Dreadnought and wave 4 (no config change). The "flatten chains in tests" item was impossible from tests alone and was split.
- **server**: Server.Tests regrouped (Api/Commands, Api/Reports, Game/Discord, Game/Clock), `GameSessionTests` split, `GameOutcome` catches log a warning, restart-safety test, README on test mode, Discord, `/health`, `/outcome`. `DiscordSessionTests` call chains not fixed.
- **web**: shared constants, scout range text hint from `SightHops`, Next upgraded (build passes first run), `useGameEvents` live-wiring test with a fake connection, README for a 1-hour test game.
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests (about 3,100 lines) still needs the user's OK. Milestone i and the "old server gone" Done item stay open. It would also lift the dependency score and cut the test count.
- **failed to merge**: nothing.
- Full checks were not run: milestone i is open and the score is under 90, so the game is not complete.

## Round 7
Code-quality score (`codequality . --quick`): **90.4** (up 0.5 from 89.9, floor met). Weakest: "Minimize dependencies" 67.7% (old TS server deps), "Simple beats clever" 80.6%, "Test what matters" 81.6%, "No magic numbers" 85.5%, "Power of 6s" 83.5%.

- **core**: removed the blocking `.Result`, renamed clashing test helpers, flattened the `FullHp` chain, merged duplicate tests into Theories, Core README with balance numbers and a test-mode game description. `GameState` split skipped on purpose (JSON shape risk).
- **server**: renamed Discord test helpers, grouped folders, merged tests into Theories, README on the test-game run order.
- **web**: comments on unexplained code, constants for repeated strings, `it.each` merges, README play-through checklist. The 3 plain `<img>` are in renderer files and stay.
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests still needs the user's OK. Milestone i and the "old server gone" Done item stay open. It would also lift the dependency score.
- **failed to merge**: nothing.
- Full checks were not run: milestone i is open, so the game is not complete. Round 7 build notes: `orval` was missing from node_modules until `npm install`.

## Round 8
Code-quality score (`codequality . --quick`): **90.3** (down 0.1 from 90.4, floor met). Weakest: "Minimize dependencies" 67.9% (old TS server deps), "Test what matters" 80.4%.

- **core**: shared `GameSeconds` constants replacing duplicated time literals, "Power of 6s" check (nothing easy left), tests merged into Theories, `waves` command in `server/Sim` with the result in the Core README. No config change.
- **server**: magic-number and "Simple beats clever" cleanups, folder and long-method cleanup, test-mode full-game test with the fake engine (GameEnded notification sent once, outcome endpoint).
- **web**: constants merged, named handlers in `FleetSendDialog`, `useQuote` test (and a fix), README checklist wording fixed.
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests still needs the user's OK. Milestone i and the "old server gone" Done item stay open.
- **failed to merge**: nothing.
- Full checks were not run: milestone i is open, so the game is not complete (COMPLETE not created).

## Round 9
Code-quality score (`codequality . --quick`): **90.4** (unchanged from round 8, floor met). Weakest: "Minimize dependencies" (old TS server deps), "Test what matters" 81.4% (too many tests, not too few).

- **core**: merged a few overlapping tests, 4-player and 8-player wave check recorded in the Core README. No config change.
- **server**: removed `EngineFactoryTests`, merged tests into Theories. API JSON and `openapi.json` unchanged.
- **web**: checked the "Test what matters" finding; no code change needed.
- **blocked**: `[!]` deleting `lib/server`, `app/api`, `app/legacy`, `components/screens|panels|hooks`, `lib/defs.ts`, `lib/economy.ts` and old tests still needs the user's OK. Milestone i and the "old server gone" Done item stay open.
- **failed to merge**: nothing.
- Full checks were not run: milestone i is open, so the game is not complete (COMPLETE not created). No new work items are planned for round 10; only the blocked deletion remains.

## Milestones
- [x] a. Rules in C# (Core): done; Sim used for the balance pass.
- [x] b. World (Core): done, travel and objective tests exist.
- [x] c. Economy and building (Core): done.
- [x] d. Fleets (Core): done.
- [x] e. Enemy and endgame (Core): done.
- [x] f. Server: done; real-engine end-to-end test passes.
- [x] g. Client plumbing (web): done, generated Zod in use.
- [x] h. Game UI (web): all panels done; scout range shown as text hint; live wiring tested with a fake connection.
- [~] i. Cleanup: README and `npm run play` done; old TS server (`lib/server`, `app/api`) and legacy UI still in the repo, blocked on the user's OK to delete.
- [~] j. Balance and polish: balance run done; server test-mode full game test done; Core README, server and web docs done; test-mode play-through checklist is in the web README. Done apart from the final tuning from a real play-through.
