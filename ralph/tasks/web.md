# web tasks (round 8)

Owns `app/**` (not `app/api/**`), `components/**`, `lib/**` (not `lib/server/**`), `tests/**`, `orval.config.ts`. Do not change how the renderer (`components/maps/**`, `components/planet/**`) looks or works. Read the Next docs in `node_modules/next/dist/docs/` before writing Next code. Build against `server/openapi.json` and the generated client in `lib/api/generated` (never edit generated files).
- [!] Delete `/legacy` (app/legacy, components/screens, components/panels, components/hooks), then `lib/defs.ts` and `lib/economy.ts` if unused, and the old `lib/` tests (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 90.4. Run `codequality . --full` and fix the worst "No magic numbers" findings in `components/game/**`, `components/home/**`, `components/lobby/**`, `lib/api/**` (named constants in `lib/`). Skip renderer and legacy files.
- [ ] Quality: "Simple beats clever" in the same non-renderer, non-legacy files: split long chained expressions into named steps or add a one-line comment. Tests and build stay green.
- [ ] Quality: "Test what matters": add tests for any non-renderer game component or `lib/api` helper with no test (check by looking in `tests/**`), focusing on the trip timer, warnings and end screen.
- [ ] Polish (milestone j): walk through the README test-mode checklist against the real pages and fix wording that no longer matches the UI.
