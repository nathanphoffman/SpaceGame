# web task (round 9)

Owns `app/**` (not `app/api/**`), `components/**`, `lib/**` (not `lib/server/**`), `tests/**`, `orval.config.ts`. Do not change how the renderer (`components/maps/**`, `components/planet/**`) looks or works. Read the Next docs in `node_modules/next/dist/docs/` before writing Next code. Build against the contract.
- [!] Delete `/legacy` (app/legacy, components/screens, components/panels, components/hooks), then `lib/defs.ts` and `lib/economy.ts` if unused, and the old `lib/` tests (milestone i). Blocked: needs the user's OK to delete files; do not do it until this line is changed.
- [ ] Quality: "Test what matters" for non-renderer, non-legacy files: run `codequality . --full`, add or tighten tests for the worst-flagged `components/game/**` and `lib/api/**` files (reports page, upgrades, trade panel).
