# core tasks (round 9)

Owns `server/Core/**`, `server/Core.Tests/**`, `server/Sim/**`. One item per Claude session. Core is pure C#: no I/O, no clock, dice and time are arguments.
- [ ] Quality: "Test what matters" is at 80%. Run `codequality . --full`, pick the worst findings in `server/Core.Tests/**` (tests with no real assertion, duplicate setup) and fix them without dropping battle, travel, scoring or enemy coverage. Do not delete files.
- [ ] Polish (milestone j): run `server/Sim` for a 4-player and an 8-player test-mode (TimeScale 168) wave check, record the numbers in `server/Core/README.md`; change `GameConfig` only if Earth falls on wave 1 to 2 with sensible play or waves never threaten.
