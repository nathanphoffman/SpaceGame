# Space Game

A multiplayer space strategy game played in a shared galaxy. Next.js front end, .NET 10 server (game rules), Postgres, live updates over SignalR.

```bash
npm ci
npm run play          # starts Postgres (Docker), the .NET server (:5000) and Next (:3000)
```

Open http://localhost:3000, create a game and share the code with friends. The host starts the game from the lobby.

## Play a 1-hour test game

1. `npm ci`, then `npm run play` (needs Docker and the .NET 10 SDK). Wait until Next prints `Ready`.
2. Open http://localhost:3000. In "Create a game", type your name, set Mode to "1-hour test" and press Create. You land in the lobby as the host.
3. Friends open the same address (or the "Share" link from the lobby), type the game code under "Join a game", add their name and press Join. Up to 8 players.
4. When everyone is listed under "Players", the host presses "Start game". The game page opens for all players.
5. Test mode runs 168x faster than a real week, so the game ends after about one hour.

### Final test-mode play-through checklist

Times are real minutes after the host presses "Start game" (game time runs 168x faster).

- **Minute 5:** The galaxy map shows your team's planets. Open your home system, click a planet and build a mine or a shipyard; the build shows in the queue. Queue a ship once a shipyard is done. "Fleets in flight" lists any trip, with its prep countdown first. Press "? How to play" and Escape to close it.
- **Minute 20:** Mines have paid out and the resource counts in the top bar have grown. Send a fleet (or a Colony ship) to another planet: "Get quote" shows the trip time, then "Send fleet". Watch the ship move on the map. The first Earth attack arrives around minute 13 to 20, so look for "Incoming attacks" in the warning strip, then a battle toast and an entry under "Reports".
- **Minute 40:** The team score bar has moved (objective planets give points each game hour). Open a battle report ("Read the report") to see rounds and losses. Later Earth attacks arrive about every 6 minutes and are bigger each time, so check that your defense holds.
- **Minute 60:** The game ends at the one-week limit (about 60 minutes) or earlier if a side reaches 500 points or a home world falls. The "Game over" screen shows the winner, both scores and each player's points, battles won and planets captured. "Back to home" returns to the start page.

## Controls

- Click a system on the galaxy map to open it; click a planet for its details.
- On your planets: build mines, shipyards and defense, and queue ships.
- Pick ships and a target planet to send a fleet. The dialog shows the trip time (5 minutes prep plus flight). Recall a fleet from the fleet list.
- Use a Colony ship to claim a new planet. Watch the warning strip for incoming enemy fleets and open reports for battle results.
- Press Escape to close the planet panel or the how-to-play panel. The "? How to play" button in the top bar shows a short rules summary.
- The bars in the top bar show score progress; the game ends when a team reaches the target or the week runs out.

## Server (.NET)

```bash
docker compose up -d db                      # Postgres on localhost:5440
dotnet run --project server/Server           # applies migrations at start
```

Environment variables (ASP.NET style, `__` for nested keys):

| Variable | Default | Meaning |
|---|---|---|
| `ConnectionStrings__Postgres` | `Host=localhost;Port=5440;Database=spacegame;Username=space;Password=space` | Database connection (the default matches the compose DB) |
| `Database__MigrateOnStart` | `true` | Apply pending EF migrations when the server starts |
| `GameClock__TickSeconds` | `5` | How often the clock advances running games (min 1) |
| `ASPNETCORE_URLS` | `http://localhost:5000` | Address the server listens on |

Run steps:

1. `docker compose up -d db` starts Postgres.
2. Run `dotnet run --project server/Server`. It applies migrations and prints the URL it listens on.
3. Open `/health` (returns `{"status":"ok"}`) to check it is up. The OpenAPI document is `server/openapi.json`.

Test-mode game: create a game with `"mode": "test"`. It runs 168x faster than `"week"` mode, so a week of game time passes in about one hour. Use `GameClock__TickSeconds=1` to make it smoother.

1-hour test game, server side only: (1) `docker compose up -d db`, (2) `GameClock__TickSeconds=1 dotnet run --project server/Server` (migrates the database, then listens on :5000), (3) `curl -X POST localhost:5000/api/games -H 'Content-Type: application/json' -d '{"name":"Me","mode":"test"}'` and keep the `playerToken`, (4) `curl -X POST localhost:5000/api/games/<gameId>/start -H "Authorization: Bearer <playerToken>"`.

Discord alerts: pass an optional `discordWebhookUrl` (must be an `https` URL, otherwise the create call fails with a 400) when creating a game. The server then posts one message to that webhook for each enemy fleet spotted heading for your planets. If Discord is down or the URL is wrong, the game carries on and only a warning is logged.

Game end: `GET /api/games/{gameId}/outcome` returns the winner, the reason, both team scores and each player's contribution. Before the game has ended it answers 404.

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
