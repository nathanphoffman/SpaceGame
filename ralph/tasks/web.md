# web tasks (round 5)

Owns `app/**` (not `app/api/**`), `components/**`, `lib/**` (not `lib/server/**`), `tests/**`, `orval.config.ts`. Do not change how the renderer (`components/maps/**`, `components/planet/**`) looks or works. Read the Next docs in `node_modules/next/dist/docs/` before writing Next code. Build against `server/openapi.json` and the generated client in `lib/api/generated` (never edit generated files).
- [!] Delete `/legacy` (app/legacy, components/screens, components/panels, components/hooks), then `lib/defs.ts` and `lib/economy.ts` if unused, and the old `lib/` tests (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: the score is 90.0. In web files outside the renderer, shrink the longest functions (over 36 lines) and folders with more than 6 items (`components/game` 14, `lib/api` 12) by moving files into subfolders and fixing imports; keep tests green. Do not widen `.codequalityignore`.
- [ ] Game UI: loading, empty and error states for the game page (state query fails, game not found, token missing -> redirect to home), with tests.
- [ ] Game UI: reconnect handling end to end: after a SignalR drop and reconnect, refetch state and show no stale warning strip; test with a fake hub.
- [ ] Controls and docs: keyboard shortcuts for closing panels and a short "how to play" panel (rules summary from SPEC: score, 500 points, Earth attacks, fog of war) reachable from the top bar; update README controls.
- [ ] Polish: mobile/narrow layout check for the top bar, panels and lobby (CSS only, no renderer changes); add component tests for the top bar and end screen.
