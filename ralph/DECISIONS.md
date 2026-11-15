# Decisions

Calls the loop made without asking. One line each: `[round N, area] what and why`.
To override one, edit or add a line here (`HUMAN:` prefix); workers read this file.

- HUMAN: Co-op against an AI enemy. Score race to 500 or one week, whichever first. Taking the enemy home world wins instantly, the enemy winning a battle at Earth loses instantly.
- HUMAN: No bases that shoot. Defense building = defenders hit one number lower. Players must keep ships on a planet to defend it.
- HUMAN: Dice are d6. Fighter 5+/1 shot/1 HP, Battleship 4+/2/4, Dreadnought 3+/5/10 (see SPEC.md).
- HUMAN: 4 resources: Iron, Hydrogen, Titanium, Helium-3. Each player has one stockpile. Haulers move resources between players.
- HUMAN: The three.js renderer stays as it is.
- HUMAN: Keep the codequality score at 90 or higher throughout (floor 85 in the full check).
- Assumed: state is stored as one JSONB snapshot per game, advanced lazily and by a background clock.
- Assumed: players can only join before the host starts the game.
- Assumed: the enemy sees everything; fog of war applies to players only.
- Known at the start: `npm run lint` has 1 error in `lib/server/seedGalaxy.ts` (an `any`); the old TS server is deleted later anyway, so round 0 fixes it with the smallest change. `next build` may fail once with a Next.js security-advisory notice on a fresh checkout; running it again passes.
- [round 0, setup] Skeleton is C# only (solution, Core stubs for every shared type, tiny Sim and Server hosts, one test each). `server/openapi.json`, the Orval client (`gen:api`) and `lib/api` are NOT created: they belong to the server and web round-1 items, and check_full skips those steps until both exist.
- [round 0, setup] `GameConfig`, `GameState`, `PlayerView`, `GalaxyMap`, `FlightQuote`, `BattleReport` are minimal placeholders with only the fields CONTRACTS.md names; core fills them in (adding only). `GameEvent` payload is `IReadOnlyDictionary<string,string>`.
- [round 0, setup] `GenerateDocumentationFile` left off in Core (it makes missing-param-doc warnings fatal under TreatWarningsAsErrors); doc comments are still written.
- [round 0, setup] Fixed `ralph/pg_up.sh`: Postgres could not create its socket in /var/run/postgresql (added `unix_socket_directories=/tmp`) and the daemon inherited the flock fd and deadlocked later callers (`9>&-`).
- [round 0, setup] Fixed the one lint error in `lib/server/seedGalaxy.ts` by moving the eslint-disable to the line above.
[round 1, core] Catalog is a record in Core (Catalog.Default) exposed as GameConfig.Catalog (init property); upgrade costs/times are my guesses (Ti+He, 2-4 h). Mine base output is 20/h at richness 100 (10 x 2).
[round 1, core] Battle ends when a side has no ships or nobody is armed; mutual wipe-out or unarmed stalemate counts as attackers not winning.
[round 1, core] Sim tests live in Core.Tests (references Sim) since no Sim.Tests project exists; --defense means defender bonus 1.
- [round 1, core] check_full.sh fails to build server/Server.Tests: NETSDK1188 (Microsoft.TestPlatform.TestHost has locales 'ja', 'ko' etc. that the .NET 10.0.404 SDK rejects). It is in the server area's project, not core's; not fixed. Core.Tests alone: format clean, build with -warnaserror clean, 31/31 tests pass.
- [round 1, core] Quality score 91.0 (>= 90). Skipped minor findings in core files (blank lines in Battle.cs and SimArgs.cs, long test names, test file size, magic numbers in GameConfig/Catalog); not worth churn.
[round 1, core] Travel constants: 90 s/AU and 750 s/ly^2 at speed 1.0, 1 s minimum flight; Engines bonus is +25% per level from the catalog.
[round 1, core] One build queue per planet holding; items (buildings and single ships) run one after another. Mine built again = next level. GameState got Planets and Players as lists (JSON-safe).
- [round 1, core] check_full build step fails with a Next.js SecurityFatalError (web area, not core; not touched). Core: 89.6 at start; added blank lines before control statements in server/Core (whitespace only).
- [round 1, core] Score stays 89.6 (target 90, floor 85 met). Added blank lines in server/Core, Sim, Core.Tests and named GameConfig/TravelConfig defaults. Remaining findings are mostly in other areas (web) or short names like 'now'/'id' across the codebase; renaming is too much churn.
[round 1, core] NewGame uses a single placeholder Earth planet (richness 50 each) and Quote uses a fixed 1 AU trip until galaxy generation exists.
- [round 1, core] Quality pass: score 89.4 -> 89.8 (target 90 not reached, floor 85 met). Added blank lines (--fix-spacing) and renamed short names (now, id, s, p, n) in Core, Core.Tests and Sim; no behaviour change. Skipped: call depth (11 levels via Advance->...->OutputPerHour, restructuring is risky), splitting big test files, long test names, Catalog magic numbers (naming them did not raise the score). The Next.js SecurityFatalError in check_full is intermittent (web area); a retry passes.
- [round 1, server] Game is created with a host-only NewGame placeholder; Start calls NewGame again with every player and the stored seed. Test mode uses WeekSeconds=3600 in GameConfig. Join codes are 5 chars from an alphabet without 0/O/1/I/L.
- [round 1, server] Full check was red: NETSDK1188 (unknown locale folders in the test SDK packages) became errors under -warnaserror, and Server.Tests resolved EF Core Relational 10.0.4 against the server's 10.0.15. Fixed by NoWarn NETSDK1188 in server/Directory.Build.props and a direct EF Core Relational reference in Server.Tests.
- [round 1, server] The first `npm run build` after an install sometimes fails once with a Next.js "security vulnerability" notice and passes on retry; treated as flaky, not acted on (no upgrade run).
- [round 1, server] Quality score 89.1 -> 89.4 (target 90 not reached). Done: blank-line style in server C#, named constants (jsonb, "Game not found.", seed, 200), renamed "And" test names, split JoinCodeTests into its own file, comment on the expected 409 catch. Tried merging LoadAsync/LoadByCodeAsync: it deepened a call chain and lowered the score, so reverted.
- [round 1, server] Skipped: remaining gaps are in other areas' TS code (short names, uncommented clever code, long functions) or in the older lib/server/engine.ts and world.ts, which are too large/risky to refactor in a quality pass.
[round 1, server] Game time = (now - StartedAt) * TimeScale, clamped to WeekSeconds; dice are seeded from game seed + game time; test mode no longer shortens WeekSeconds.
[round 1, server] Map endpoint is public per CONTRACTS.md; state and quote need a token. PlayerView.Version is set from the saved game version.
- [round 1, server] Quality pass 2: score 89.0 -> 89.4; merged-load refactor in GameRepository was reverted again (it lowers the score). Fixed: .Result false positive in PlayEndpoints (tuple deconstruction), blank lines, FakeEngine magic numbers. Skipped: swallowed 409 catch in LobbyService (needs an ILogger constructor change; the comment explains it), remaining gaps are in other areas' TS code.
[round 1, web] server/openapi.json missing, so gen:api run split into its own task; orval config points mutator at lib/api/client.ts (apiFetch).
[round 1, web] Did the client.ts/session.ts item first: the gen:api item is blocked until server/openapi.json exists. Base URL comes from NEXT_PUBLIC_API_URL (default same-origin).
[round 1, web] gen:api item is blocked (no server/openapi.json yet), so I did the QueryClientProvider/useGameEvents item instead; invalidation matches query keys starting with /api/games/{gameId} (Orval's default key).
[round 1, web] Quality pass: `dotnet build` fails in this environment (NETSDK1188 invalid locale in Microsoft.TestPlatform.TestHost), a server/SDK issue outside the web area, so only the web checks (tsc, lint, test, build) were run: all clean. Score went 88.6 -> 88.9; still under 90. Added "why" comments to swallowed catches and complex functions. Skipped (large/risky or other areas): shortening 213 long functions, renaming short names (now, id, x, y), next/image and next/link swaps (would change behaviour), C# findings (.editorconfig, HTTPS redirect, HSTS).
[round 1, web] gen:api still blocked, so did the home page at /new with hand-written Zod + apiFetch; added @types/react-dom (dev) for the render test.
[round 1, web] gen:api still blocked, so did the lobby page; copy-link uses /new?code=CODE (join form does not read it yet); host = session playerId matching the lobby player with isHost.
[round 1, web] gen:api still blocked, so did map adapters: output is the legacy GameState (numeric ids from an IdMap), orbit = 1 AU per listed planet, seed = string hash, all planets kind=empty because PlayerView has no planets yet.

- [round 1, web] Quality pass: score 89.0 -> 90.6. Caught errors in lib/api/session.ts and client.ts now `console.warn` (behaviour otherwise unchanged); un-exported unused mapAdapter helpers; added a few comments; applied `--fix-spacing` (whitespace only; reverted its change to server/Core/Battle.cs, not our area).
- [round 1, web] `npm run build` failed once with a Next.js "SecurityFatalError" upgrade notice and passed on retry (flaky). Not upgrading Next.js in a quality pass; left for the user.
- [round 1, web] Skipped: long functions, short names, SystemEngine/planet types size (large refactors); findings in lib/server, app/api and server/ (other areas).
[round 1, web] Enemy fleets get a hue-rotated icon via CSS class `enemy`; prep countdown is a small label under the icon.
[round 1, web] gen:api item still blocked: server/openapi.json does not exist yet (server area). Left open, no code changes.
- [round 1, web] Quality pass 2: score 90.6, unchanged, no code changes. The build again failed once with the Next.js SecurityFatalError notice and passed on retry; Next.js upgrade left for the user.
- [round 1, merge] All three branches merged cleanly (conflicts only in DECISIONS.md, .codequalityignore, Directory.Build.props: kept both sides). No Requests to apply.
- [round 1, merge] Glue fixes: NETSDK1188 added to NoWarn (-warnaserror made it fatal); GameRepositoryTests now compares state as JSON (Core's GameState has lists, so record equality is by reference); report stub routes declare gameId/id so Orval accepts openapi.json; generated API client committed.
- [round 1, merge] `npm run build` fails the first time with a Next.js "SecurityFatalError" upgrade notice, then passes on retry. Not upgrading Next.js in the merge step; left for the user.
- [round 1, plan] Score 87.4 < 90, so each area's list starts with quality items. Core gets the world milestone next; server finishes f using the fake engine; web moves to generated hooks and starts the game UI against the contract.
- [round 2, core] check_full.sh stops at `orval: not found` (web tooling missing on this machine); dotnet format/build/tests all pass (103 + 66). Not a core issue.
- [round 2, core] Skipped: QueueFixture.cs:29 ".Result" finding is a false positive (CommandResult.Result tuple field, not a Task).
- [round 2, core] Skipped: Core.Tests folder has 18 files and several 12-test classes; splitting further is large/low value. SimArgs "magic numbers" are argument-index checks; left as is.
- [round 2, core] Score 86.9 before and after (under 90); the remaining findings are mostly in web/server files owned by other areas.
[round 2, core] Objective band uses 2D distance from Sol divided by Sol-to-enemy-home distance (30% to 70%); Z is always 0 on the map. Only systems with known planets can hold objectives.
[round 2, core] Split the galaxy wiring item: NewGame and Quote done; PlayerView holdings and CancelQueueItem left as sub-items. Enemy ownership lives in GameState.EnemyPlanets (list of planet ids).
- [round 2, core] Score 86.7 (under 90). Only tiny owned-file fixes (blank lines in GalaxyGenerator, named constant in SimArgs); the rest is in other areas' files. Full check stops at `orval: not found` (web tool missing in this worktree's node_modules), not a core issue.
[round 2, core] Recall during prep returns ships instantly; in flight the fleet flies back for the time already flown. Cargo is taken from the stockpile at send.
- [round 2, core] Score 86.6 before (under 90). Only added blank lines in FleetOrders/FleetArrivals; remaining findings are in other areas' files or are long test files and test-chain depth (risky/large).

[round 2, server] Split the first quality item: test reorganisation done; CommandBody/GameRow splitting left as its own sub-item because it needs a JSON converter / EF owned types.
- [round 2, server] Score 87.3 before and after (target 90 not reached): most of the gap is in other areas' files (long functions, clever code in components/ and lib/ client code, dependency count).
- [round 2, server] lib/api/generated was stale after the CommandBody split; regenerated it with `npm run gen:api` and committed it. The first full check had 4 Postgres tests fail that passed on every re-run (flaky, not fixed); `next build` also stops on a Next.js security notice the first time and passes on retry.
- [round 2, server] Skipped: UseHttpsRedirection/UseHsts and .editorconfig (behaviour or wide formatting change), LobbyService SaveStartedAsync swallowed 409 (intended, already commented), AddPlayerAsync bool flag, db.ts repeated migration statements (risky SQL).
[round 2, server] BattleResolved event Data keys read as planet, attackersWon ("true"), rounds; report id is the reports row Guid. Core does not emit these yet.
- [round 2, server] Regenerated lib/api/generated (zod for report endpoints was stale); removed unused private `NotImplemented` in GameEndpoints.cs.
- [round 2, server] Score stays 87.1 (needs 90): remaining findings are in other areas' files (UI components, Core, lib/data) or are large/risky. Skipped in my area: LobbyService.cs:114 catch (intentional 409, already commented), GameClock.cs:60 catch (cancellation is the normal shutdown path), LobbyCreateTests.cs:35 blank line (nothing can go between `{` and first statement), GameRepository.cs 14 methods (split too large for a quality pass).
[round 2, server] FleetSpotted event data keys assumed: fleet, planet, arrivesAt, strength; GameEnded: outcome. Hub token also read from access_token query on /hubs.
- [round 2, server] Score was 87.1 (needs 90). Most of the loss is in files other areas own (maps, planet, panels) and in old code; I only added the missing "why" comment in GameClock and a blank line in EventNotificationsTests. Skipped: lib/server/db.ts repeated migration lines and lib/server/engine.ts size (old code, risky), call-depth chains (spread over many files).
- [round 2, server] `npm run build` fails every other run with a Next.js "security upgrade" notice from the registry check; it passes on retry. Not changed.

[round 2, web] Generated response types are void/unknown (OpenAPI has no response schemas), so forms/lobby use the generated calls and hooks but parse bodies with the existing small Zod schemas; item split, adapter part waits on the server.
- [round 2, web] check_full fails in the server tests (PlayEndpointTests.A_token_for_another_game_is_forbidden and State_and_quote_need_a_token): server area, left alone. The web checks (tsc, lint, vitest, build) pass.
- [round 2, web] Score went 87.5 -> 89.8, short of 90. Remaining gaps are mostly server-owned (deep call chains matched by name across languages, C# config) or large (splitting 70-100 line components, <img> to next/image, which could change rendering); skipped as risky.
- [round 2, web] Added short comments to clever code, renamed short names (now -> nowMs props, p/el/e/f/b/n), named a few constants, and logged the SignalR start failure instead of swallowing it.
[round 2, web] Generated-client item closed: the adapter schema swap is blocked until the server adds response schemas to openapi.json (Request open); marked [!].
- [round 2, web] Second quality pass: score still 89.8 (was 89.8 at start). Small comment/blank-line/helper tweaks in GameTopBar, GameShell, FleetsPanel, gameView. `next build` printed a "SecurityFatalError / upgrade Next.js" notice on the first run of the check script and passed on an immediate retry; no upgrade was run. The server tests passed this time.
[round 2, web] Ship/upgrade buttons send count 1 and show no costs or times (server owns them); queue list and cancel wait for queue items in PlayerView.
- [round 2, web] Score was 89.9; PlanetDetails BuildButtons now reuses CommandButtons (removes duplicate). Skipped: long map/planet functions. Added a test for `cancelQueueItemBody`. Score stays at 89.9 (just under 90); the rest is in long functions and server files outside this area.
- [round 2, web] The first `check_full.sh` build stopped on a Next.js security-advisory message that asked for an upgrade; I did not upgrade (out of scope), and the retry passed.

- Round 2 merge: applied web requests. Added `Produces<T>` to all endpoints (openapi.json now has response schemas; Orval client regenerated). `PlayerView` already carried `Holdings` (buildings, ships, queue items with ids) from core, so no change needed there.
- Round 2 merge: in `app/api/action/route.ts` kept the server side (server-owned file; web only changed a comment).
