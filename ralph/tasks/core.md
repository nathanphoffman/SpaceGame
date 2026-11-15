# core tasks (round 6)

Owns `server/Core/**`, `server/Core.Tests/**`, `server/Sim/**`. One item per Claude session. Core is pure C#: no I/O, no clock, dice and time are arguments.
- [ ] Quality: the score is 89.9. In `server/Core.Tests` (14 items in the folder, call depth over 6 in many tests) group the loose test files into subfolders (6 per folder) and flatten the longest helper chains by building state directly in fixtures. Run `codequality . --full` and fix the worst Core findings first. Do not widen `.codequalityignore`.
- [ ] Quality: shrink the longest Core functions (over 36 lines) and the 4 "and/then" test names (rename them), and add `GameState` field groups only if the JSON round-trip tests stay green (skip and note in DECISIONS.md if not).
- [ ] Polish (milestone j): add a short `server/Core/README.md` (or extend an existing doc) listing where each rule number from SPEC.md lives in `GameConfig`/`EnemyConfig`, and a Sim usage example with all flags.
- [ ] Balance check: run `server/Sim` for a Dreadnought vs Battleship+Defense fight and a 1.35x-per-wave Earth attack at wave 4; note the win rates in DECISIONS.md and tune config only if clearly broken.
