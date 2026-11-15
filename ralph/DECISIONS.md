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
