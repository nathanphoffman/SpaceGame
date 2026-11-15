# core tasks (round 5)

Owns `server/Core/**`, `server/Core.Tests/**`, `server/Sim/**`. One item per Claude session. Core is pure C#: no I/O, no clock, dice and time are arguments.
- [ ] Quality: the score is 90.0, so cut the worst findings of `codequality . --full` in Core files. Main one: call depth over 6 in tests (test helpers like `FleetGame`/`PlayerView` setup call long chains; flatten with fixtures that build state directly). Also split `GameState` (18 fields) into smaller groups only if the JSON round-trip tests stay green. Do not widen `.codequalityignore`.
- [ ] Quality: split Core files with the most functions (`Fleets/FleetBattles.cs` 15, `EndgameTests.cs` 13, `VisibilityTests.cs` 13) into files of about 6 functions each, and move some of the 37 files in `server/Core.Tests` into subfolders (6 per folder as a target).
- [ ] Sim: add a Weapons-upgrade flag and a Defense flag to the `server/Sim` CLI (e.g. `--weapons`, `--defense`), with tests; print them in the output header.
- [ ] Balance (milestone j): with the new Sim flags, print win rates for the first Earth attack (6 fighters) against 4 players' starting fleets, and the later waves (x1.35 each) against Battleships with Defense; tune `GameConfig`/`EnemyConfig` only if Earth is unbeatable with sensible play or trivial; note the numbers in DECISIONS.md.
- [ ] Scout range data: add the number of star hops each own fleet can see (Scout 2, others 1) to `PlayerView` fleets (additive field, JSON round-trip test) so web can draw a scout range hint; add a line in CONTRACTS.md Requests only if a shared interface changes.
- [ ] Polish: review `EnemyBrain` for the "never idle, explainable" rule: add a `Reason` string on each enemy order (kept in events/reports) and tests that every enemy order has one.
