# Ralph loop files (Space Game, co-op edition)

- `SPEC.md` what to build and the rules. `CONTRACTS.md` shared interfaces and file ownership. `RULES.md` code rules and the quality target. `DECISIONS.md` calls made without asking. `PROGRESS.md` per-round status.
- `tasks/<area>.md` checklists for `core`, `server`, `web`: `- [ ]` open, `- [x]` done, `- [!]` blocked.
- `check_item.sh <area>` quick check after every item, `check_full.sh` full gate. `common.sh` and `pg_up.sh` are helpers (the sandbox starts its own Postgres).
- The engine that runs these lives in the RalphLoops repo (`projects/spacegame`).
