# Decisions

Calls the loop made without asking. One line each: `[round N, area] what and why`.
To override one, edit or add a line here (`HUMAN:` prefix); workers read this file.

- HUMAN: Co-op against an AI enemy. Score race to 500 or one week, whichever first. Taking the enemy home world wins instantly, the enemy winning a battle at Earth loses instantly.
- HUMAN: No bases that shoot. Defense building = defenders hit one number lower. Players must keep ships on a planet to defend it.
- HUMAN: Dice are d6. Fighter 5+/1 shot/1 HP, Battleship 4+/2/4, Dreadnought 3+/5/10 (see SPEC.md).
- HUMAN: 4 resources: Iron, Hydrogen, Titanium, Helium-3. Each player has one stockpile. Haulers move resources between players.
- HUMAN: The three.js renderer stays as it is.
- HUMAN: Keep the codequality score at 90 or higher throughout (floor 85 in the full check).
- Assumed: state is stored as one JSONB snapshot per game, advanced lazily and by a background clock.
- Assumed: players can only join before the host starts the game.
- Assumed: the enemy sees everything; fog of war applies to players only.
- Known at the start: `npm run lint` has 1 error in `lib/server/seedGalaxy.ts` (an `any`); the old TS server is deleted later anyway, so round 0 fixes it with the smallest change. `next build` may fail once with a Next.js security-advisory notice on a fresh checkout; running it again passes.
