# Contracts

The shared interfaces the three areas build against. Round 0 turns the interfaces below into compiling stubs (C# in `server/`, plus an
OpenAPI file and a generated TS client). After that nobody edits a shared interface except the merge/plan step: to change one, add a line
under "Requests" at the bottom and the next merge applies it. Areas may only *add* to a shared interface, never change or remove.

## Ownership (disjoint)
| Area | Owns (may edit freely) |
|---|---|
| `core` | `server/Core/**`, `server/Core.Tests/**`, `server/Sim/**` (the battle simulator), `ralph/tasks/core.md` |
| `server` | `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**` and `app/api/**` (the old TS server: server deletes it, and only when milestone i says so), `ralph/tasks/server.md` |
| `web` | `app/**` except `app/api/**`, `components/**`, `public/**`, everything in `lib/**` except `lib/server/**` (this includes the new `lib/api/**`), `tests/**`, `orval.config.ts`, `ralph/tasks/web.md` |

Layout of `server/`: `SpaceGame.sln`, `Directory.Build.props`, `Core/SpaceGame.Core.csproj`, `Core.Tests/SpaceGame.Core.Tests.csproj`,
`Sim/SpaceGame.Sim.csproj` (console app, references Core), `Server/SpaceGame.Server.csproj` (references Core), `Server.Tests/SpaceGame.Server.Tests.csproj`.
Those exact project file names are used by `ralph/check_item.sh`.

**Integration points** (shared files many areas edit): append-only, one line or one small change each, mention it in the commit message.
- `server/SpaceGame.sln`, `server/Directory.Build.props` (add projects and shared build settings)
- `package.json`, `package-lock.json` (add a dependency or a script)
- `.gitignore`, `.codequalityignore`, `README.md`, `AGENTS.md`, `docker-compose.yml`
- `ralph/DECISIONS.md`, `ralph/CONTRACTS.md` (Requests section only), `ralph/RULES.md`

## Shared interfaces

### Core (C#, namespace `SpaceGame.Core`)
Ids are `readonly record struct` wrappers around a string: `PlayerId`, `PlanetId`, `SystemId`, `FleetId`. Time is `long` game seconds since the start.

```csharp
public enum Element { Iron, Hydrogen, Titanium, Helium3 }
public enum ShipType { Scout, Hauler, Colony, Fighter, Battleship, Dreadnought }
public enum BuildingType { Mine, Shipyard, Defense, Mining }     // Mine is per Element; Shipyard, Defense and Mining are per-planet levels with no top
public enum Side { Team, Enemy }

public sealed record Resources(int Iron, int Hydrogen, int Titanium, int Helium3);   // with + - and comparison helpers
public interface IDice { int Roll(); }                    // 1..6; tests use a scripted one, the server a seeded one

public sealed record GameConfig(/* every tunable number: costs, times, speeds, enemy settings, score target, week length */);
public sealed record GameSetup(int Seed, IReadOnlyList<PlayerSetup> Players, GameConfig Config);
public sealed record PlayerSetup(PlayerId Id, string Name);

public sealed record GameState(/* galaxy, planets, holdings, fleets, queues, stockpiles, upgrades, enemy memory, scores, outcome */);
// GameState and everything inside it must round-trip through System.Text.Json (the server stores it as JSONB).

public abstract record GameCommand;
public sealed record BuildBuilding(PlanetId Planet, BuildingType Type, Element? Element) : GameCommand;
public sealed record QueueShip(PlanetId Planet, ShipType Type, int Count) : GameCommand;
public sealed record SendFleet(PlanetId From, IReadOnlyDictionary<ShipType, int> Ships, PlanetId To, Resources? Cargo) : GameCommand;
public sealed record RecallFleet(FleetId Fleet) : GameCommand;
public sealed record Colonize(PlanetId Planet) : GameCommand;     // uses one Colony ship of the player at that planet
public sealed record CancelQueueItem(PlanetId Planet, string ItemId) : GameCommand;

public sealed record CommandResult(bool Ok, string? Error);       // Error is a short player-readable sentence
public sealed record GameEvent(long Time, string Kind, /* payload */);   // FleetSpotted, BattleResolved, PlanetCaptured, ScoreChanged, GameEnded ...

public interface IGameEngine
{
    GameState NewGame(GameSetup setup);
    /// Moves the game forward to `now`, resolving everything due in time order (builds, arrivals, battles, enemy orders, hourly score). Pure and deterministic given the dice.
    (GameState State, IReadOnlyList<GameEvent> Events) Advance(GameState state, long now, IDice dice);
    (GameState State, CommandResult Result) Apply(GameState state, PlayerId player, GameCommand command, long now);
    PlayerView ViewFor(GameState state, PlayerId player, long now);   // fog of war applied, stockpile brought up to date
    GalaxyMap Map(GameState state);                                    // public map data (systems, planets, richness)
    FlightQuote Quote(GameState state, PlayerId player, SendFleet send, long now);   // trip timer: prep + flight, arrival time
}
// PlayerView, GalaxyMap, FlightQuote, BattleReport are plain records defined in Core; they become the API's response types.
// PlayerView.Fleets (own and visible enemy) carry what the map needs to draw movement: id, owner, Side, From, To, LaunchAt (when it was ordered),
// DepartAt (end of the 5-minute prep), ArriveAt (all game seconds), ship counts and cargo. PlayerView also has GameTime so the client can animate in sync with the server.
public static class GameEngineFactory { public static IGameEngine Create(); }
```
- The dice battle is `BattleResolver.Resolve(BattleSide attackers, BattleSide defenders, int defenderBonus, IDice dice) -> BattleResult` (public, used by the engine and the simulator).
- `server/Sim` is a console app: `dotnet run --project server/Sim -- fight "10 fighter" "2 battleship" --runs 1000` prints win rates, average survivors and cost efficiency.

### HTTP API (owned by `server`, described by `server/openapi.json`, which the build regenerates)
All JSON. Errors are `ProblemDetails`. Player calls send `Authorization: Bearer <playerToken>` (token returned by create and join).
- `POST /api/games` body `{ name, mode: "week" | "test", seed?, discordWebhookUrl? }` -> `{ gameId, code, playerId, playerToken }` (the creator is the host and the first player)
- `POST /api/games/join` body `{ code, playerName }` -> `{ gameId, playerId, playerToken }` (only before start, max 8)
- `GET /api/games/{gameId}/lobby` -> `{ code, mode, started, players: [{ id, name, isHost }] }` (needs a player token of that game)
- `POST /api/games/{gameId}/start` (host only)
- `GET /api/games/{gameId}/map` -> `GalaxyMap` (public, cacheable)
- `GET /api/games/{gameId}/state` -> `PlayerView` (with `version`, `gameTime`, `timeLeftSeconds`, scores, own planets, stockpile, queues, upgrades, visible fleets, recent reports)
- `POST /api/games/{gameId}/commands` body is one command as `{ type: "buildBuilding" | "queueShip" | "toggleAuto" | "sendFleet" | "recallFleet" | "colonize" | "cancelQueueItem", ... }` -> `CommandResult`
- `POST /api/games/{gameId}/quote` body a `sendFleet` command -> `FlightQuote`
- `GET /api/games/{gameId}/reports` -> list of `BattleReport`; `GET /api/games/{gameId}/reports/{id}`

### Live updates (SignalR, hub `/hubs/game`, query `gameId` and `access_token`)
Server to client only (commands go through REST): `StateChanged(version)`, `FleetSpotted(fleetId, targetPlanetId, arrivesAtGameTime, strengthHint)`, `BattleResolved(reportId)`, `GameEnded(outcome)`. The client reacts by invalidating its TanStack queries.

### Persistence (owned by `server`)
`games(id, code unique, status, mode, config jsonb, state jsonb, version, discord_webhook, created_at, updated_at)`, `players(id, game_id, name, token_hash, is_host)`, `reports(id, game_id, game_time, kind, payload jsonb)`. Use optimistic concurrency on `version`. A per-game lock inside the process so the clock service and requests never advance the same game at once.

### Client contract (owned by `web`)
- `npm run gen:api` runs Orval on `server/openapi.json` and writes `lib/api/generated/**` (TanStack Query hooks and Zod schemas). The output is committed; `check_full.sh` fails if it is stale.
- The session (gameId, playerId, token) is kept in `localStorage` under one key by `lib/api/session.ts`.
- Home `/`, lobby `/game/[gameId]/lobby`, game `/game/[gameId]`.

## Requests
(Workers add one line here when they need a shared interface changed. The merge step applies and clears them.)
