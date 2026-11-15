# server tasks (round 10)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Depend only on `IGameEngine` and the fake engine in `Server.Tests`.
- [ ] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). The user has approved this deletion (see DECISIONS.md); do it, and make sure nothing else imports what you delete.
