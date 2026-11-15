# server tasks (round 8)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Depend only on `IGameEngine` and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 90.4. Run `codequality . --full` and fix the worst "No magic numbers" and "Simple beats clever" findings in `server/Server/**` (not `Persistence/Migrations`): named constants, a one-line comment above clever code. API JSON must not change; `server/openapi.json` stays in sync.
- [ ] Quality: fix easy "Power of 6s" findings in `server/Server/**` and `server/Server.Tests/**` (long methods, folders over 6 items, deep call chains from clashing helper names). Tests stay green.
- [ ] Polish (milestone j): add a test that runs a test-mode game through the clock service with the fake engine until `GameEnded`, and checks the outcome endpoint and the Discord alert are sent once.
