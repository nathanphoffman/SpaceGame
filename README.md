# Space Game (demo)

Tiny single-player OGame-style demo. Next.js + Postgres.

```bash
npm run play          # starts Postgres (Docker) + the app
```

Tables are created and seeded automatically on first request. Use the Reset button to start over.

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
