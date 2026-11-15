# Space Game

A multiplayer space strategy game played in a shared galaxy. Next.js front end, .NET 10 server (game rules), Postgres, live updates over SignalR.

```bash
npm ci
npm run play          # starts Postgres (Docker), the .NET server (:5000) and Next (:3000)
```

Open http://localhost:3000, create a game and share the code with friends. The host starts the game from the lobby.

## Controls

- Click a system on the galaxy map to open it; click a planet for its details.
- On your planets: build mines, shipyards and defense, and queue ships.
- Pick ships and a target planet to send a fleet. The dialog shows the trip time (5 minutes prep plus flight). Recall a fleet from the fleet list.
- Use a Colony ship to claim a new planet. Watch the warning strip for incoming enemy fleets and open reports for battle results.
- The bars in the top bar show score progress; the game ends when a team reaches the target or the week runs out.

## Server (.NET)

```bash
docker compose up -d db                      # Postgres on localhost:5440
dotnet run --project server/Server           # applies migrations at start
```

Environment variables (ASP.NET style, `__` for nested keys):

| Variable | Default | Meaning |
|---|---|---|
| `ConnectionStrings__Postgres` | `Host=localhost;Database=spacegame;Username=postgres` | Database connection. For the compose DB: `Host=localhost;Port=5440;Database=spacegame;Username=space;Password=space` |
| `Database__MigrateOnStart` | `true` | Apply pending EF migrations when the server starts |
| `GameClock__TickSeconds` | `5` | How often the clock advances running games (min 1) |
| `ASPNETCORE_URLS` | `http://localhost:5000` | Address the server listens on |

Run steps:

1. `docker compose up -d db` starts Postgres.
2. Set `ConnectionStrings__Postgres` (see the table) and run `dotnet run --project server/Server`.
3. Open `/health` to check it is up. The OpenAPI document is `server/openapi.json`.

Test-mode game: create a game with `"mode": "test"`. It runs 168x faster than `"week"` mode, so a week of game time passes in about one hour. Use `GameClock__TickSeconds=1` to make it smoother.

### HTTP endpoints

Errors are `ProblemDetails`. Player calls send `Authorization: Bearer <playerToken>` (returned by create and join).

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /health` | no | Health check |
| `POST /api/games` | no | Create a game (`name`, `mode`, optional `seed`, `discordWebhookUrl`) |
| `POST /api/games/join` | no | Join a lobby by `code` and `playerName` |
| `GET /api/games/{gameId}/lobby` | yes | Lobby info and players |
| `POST /api/games/{gameId}/start` | host | Start the game |
| `GET /api/games/{gameId}/map` | no | Galaxy map |
| `GET /api/games/{gameId}/state` | yes | Your view of the game |
| `POST /api/games/{gameId}/commands` | yes | Send one command |
| `POST /api/games/{gameId}/quote` | yes | Flight quote for a `sendFleet` command |
| `GET /api/games/{gameId}/reports` | yes | List battle reports |
| `GET /api/games/{gameId}/reports/{id}` | yes | One battle report |
| `GET /api/games/{gameId}/outcome` | yes | Final outcome |
| `/hubs/game` (SignalR) | token | Live updates; query `gameId` and `access_token` |
