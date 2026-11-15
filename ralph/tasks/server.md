# server tasks (round 10)

Owns `server/Server/**`, `server/Server.Tests/**`, `server/openapi.json`, `lib/server/**` and `app/api/**` (both already deleted). Depend only on `IGameEngine` and the fake engine in `Server.Tests`.

- [ ] Quality (call depth in tests): in `server/Server.Tests/**` find the test helpers that wrap other helpers (check `codequality . --full` RULE-01-CALL-DEPTH for server files) and flatten them so no test is more than 6 calls deep. Do not change API JSON or `openapi.json`.
- [ ] Quality (test count): merge overlapping `[Fact]`s in `server/Server.Tests/**` into `[Theory]`s with `InlineData` where they differ only by values, without losing coverage of an endpoint or rule. Aim to remove at least 10 test methods.
- [ ] Quality (comments and names): rewrite the "what" comment at `server/Server/Api/ReportEndpoints.cs:27` to say why; shorten nothing else. Rename server test methods whose names contain "And", "Or" or "Then" to one-job names.
- [ ] Quality (magic numbers and strings): name unnamed numbers and repeated strings (e.g. "GameEnded" event key) in `server/Server/**` as constants.
