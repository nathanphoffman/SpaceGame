# Rules for the Space Game loop

Read this every session. It is the repo's rules file for workers.

## Before anything
- `AGENTS.md` says this Next.js is NOT the one you know: **read the relevant guide in `node_modules/next/dist/docs/` before writing any Next code**, and heed deprecation notices. (Run `npm ci` first if `node_modules` is missing.)
- Never ask questions. Make the simplest reasonable choice and log it in `ralph/DECISIONS.md`.
- Never commit secrets. Never touch `.env*`.

## Code quality (important)
- The `codequality` tool grades this repo. **Keep the total score at 90 or higher the whole way through.** `ralph/check_full.sh` fails below 85, so 85 is the floor and 90 is the target.
- Run `codequality . --quick` (score only) after a larger item, and `codequality . --full` in quality passes (it lists each finding, what it looks for and how to fix it). Fix findings in the files you touched before ticking your item. Do not chase the number with artificial changes, and do not weaken `.codequalityignore` to hide real code.
- Generated code (`lib/api/generated`, EF `Migrations`, `server/openapi.json`, `bin/`, `obj/`) goes in `.codequalityignore`. Nothing else does.
- Short functions (about 30 lines at most), shallow nesting (3 levels at most), no magic numbers (name them; game numbers live in the config types), clear names, a comment only where the why is not obvious. Keep files small; split before one grows past about 300 lines.
- Tests for everything that has rules in it. Core is plain code with no I/O so it is tested with plain unit tests.

## C# (server/)
- .NET 10 (`net10.0`), C# latest, `<Nullable>enable</Nullable>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, `<ImplicitUsings>enable</ImplicitUsings>` in `server/Directory.Build.props`. Test framework: xUnit. No other test libraries unless needed.
- Core has **no** dependencies on ASP.NET, EF or the clock: time is an argument (`GameTime` = game seconds as `long`), randomness comes from `IDice`. No statics holding state, no `DateTime.Now`, no `Random.Shared` in Core.
- Immutable records and small pure functions where possible. State changes return a new state or an explicit list of `GameEvent`s.
- Public API of Core is the shared interfaces in `CONTRACTS.md`. Do not rename them.
- Tests that need Postgres are marked `[Trait("Category", "Postgres")]` and skip when `SPACEGAME_TEST_PG` is not set. Each test uses its own schema or a unique game id so tests can run in parallel.
- API errors are `ProblemDetails`. Validate every command; never trust the client.
- Add `server/**/bin/`, `server/**/obj/` and similar to `.gitignore` when you create the solution.

## TypeScript (web)
- Strict TypeScript, no `any`, tabs for indentation (see existing files), Zod to parse everything that comes from the API (the generated schemas), TanStack Query for all server data. No `useEffect` fetching.
- Keep how the maps and the planet renderer look and behave (`components/maps/**`, `components/planet/**`), **including the ships you can see moving between planets and between systems** (fleet icons, flight lines, facing the direction of travel, positions animated from departure and arrival times). You may change what data goes in and make small edits so `LocalMap.tsx`, `SolarMap.tsx` and `flightOf` take the new fleet data, but not their look. Adapters live in `lib/api/adapters`.
- The server owns the rules. The client never has its own copy of ship stats, costs or travel times: it shows what the API sends.
- Tests with vitest; mock `fetch` in tests, never call a real server.

## Git
- Commit on your branch with a clear message. Do not push. Do not rewrite history.
- Tick your item in your `tasks/<area>.md` only when its check passes.
