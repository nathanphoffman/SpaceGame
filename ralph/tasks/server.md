# server tasks (round 9)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Depend only on `IGameEngine` and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: "Test what matters" in `server/Server.Tests/**`: merge tests that restate each other into Theories and drop trivial assertions (list in DECISIONS.md). API JSON and `server/openapi.json` must not change.
