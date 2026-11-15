# web task (round 10)

Owns `app/**` (not `app/api/**`), `components/**`, `lib/**` (not `lib/server/**`), `tests/**`, `orval.config.ts`. Do not change how the renderer (`components/maps/**`, `components/planet/**`) looks or works. Read the Next docs in `node_modules/next/dist/docs/` before writing Next code. Build against the contract.

- [ ] Quality (dependencies): remove `pg` and `@types/pg` from `package.json` (nothing imports them; the old TS server is gone) and refresh `package-lock.json` with `npm install`. Run `npm run build` and `npm test` afterwards.
- [ ] Quality (unused exports): `lib/defs.ts` has exports nothing imports (`mineElement`, `buildingInfo`, `buildCost`, `buildSeconds`, `shipSeconds`, ...). Remove the unused functions and any tests only covering them; remove `export` where used only in-file. Keep what the renderer and adapters import.
- [ ] Quality (explain clever code): add a short "why" comment to the regexes in `components/game/reports/ReportViews.tsx:51,68` and the nested closures in `components/game/commands/CommandButtons.tsx:16` and `FleetSendDialog.tsx:55,70`.
- [ ] Quality (repeated strings and numbers): define the repeated strings ("planet" 13x, "fleet" 6x) and numbers used in 2+ files (10, 3, 4, 0.25) as shared constants in `lib/` and use them in the non-renderer files.
- [ ] Quality (flag parameters): split `useEscape`, `useOutcome` (`lib/api/game/gameView.ts:14`) so they do not take a boolean next to other params, if it can be done without changing behaviour; keep tests green.
- [ ] Quality (test count): merge overlapping `it(...)` tests under `tests/` and `components/**` into `it.each` tables where they differ only by values. Aim to remove at least 10 `it` calls without losing coverage.
