# core tasks (round 8)

Owns `server/Core/**`, `server/Core.Tests/**`, `server/Sim/**`. One item per Claude session. Core is pure C#: no I/O, no clock, dice and time are arguments.
- [ ] Quality: the score is 90.4. Run `codequality . --full` and fix the worst "No magic numbers" findings in `server/Core/**` (name the constants, or move them into `GameConfig` if they are rules numbers). Behaviour and JSON shape must not change; all tests stay green.
- [ ] Quality: fix the "Power of 6s" findings in `server/Core/**` that are easy: methods over 36 lines or with more than 6 parameters, by extracting small helpers with unique names. Skip anything that changes the JSON shape.
- [ ] Quality: "Test what matters": in `server/Core.Tests/**`, find tests that only restate another test's assertion or test trivial records, and merge them into Theories (list what you merged in DECISIONS.md). Keep battle, travel, scoring and enemy coverage. Do not delete files.
- [ ] Polish (milestone j): add a `server/Sim` flag or README example showing a full wave-by-wave Earth attack check at TimeScale 168, and put the result in `server/Core/README.md`. No config change unless the numbers are clearly off.
