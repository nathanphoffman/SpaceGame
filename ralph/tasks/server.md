# server tasks (round 7)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**`, `app/api/**`. Depend only on `IGameEngine` and the fake engine in `Server.Tests`.
- [!] Delete the old TS server (`lib/server`, `app/api`) and anything else only they use (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 89.9. Call depth: the checker matches calls by name, so test helpers named like Core methods (`Build`, `Run`, `Advance`, `SetUpAsync`) join Core's deep chains. In `Server.Tests/Game/Discord/DiscordSessionTests.cs` (the three 13-deep tests) and other files in `RULE-01-CALL-DEPTH` findings, rename helpers to unique names and have the test call 2 or 3 helpers itself instead of chaining. Rerun `codequality . --full`.
- [ ] Quality: `Server.Tests` folders and `Server/` folders over 6 items (see `RULE-01-FOLDER-ITEMS`): group files into subfolders of about 6. Replace short names (`id`, `now`, `row`) in `Server/**` with longer ones where it does not change the API JSON.
- [ ] Quality: Server.Tests has more tests than needed. Merge near-duplicate tests into `[Theory]` cases (list what you merged in DECISIONS.md); keep coverage of auth, lobby rules, commands, clock, outcome.
- [ ] Polish: a README line with the "1-hour test game" run order for the server side (migrate, start, create test-mode game), checked against `Program.cs`.
