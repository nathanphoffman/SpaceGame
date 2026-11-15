# Spec: Space Game, co-op edition

## Goal
A small, arcade-style, real-time **co-op** space game for 1 to 8 friends, played over **one real week**.
All players start on Earth in Sol, in a "local group" of about two dozen real star systems. An enemy AI starts at the far edge with one
big home world, slowly colonizes inward, and now and then launches bigger attacks on Earth. The team holds objective planets to score
points and tries to take the enemy home world before the enemy scores more or takes Earth.
Flights take hours, so an incoming invasion can be seen in advance and friends can send help.

The renderer for planets, systems and the galaxy map (three.js, in `components/maps` and `components/planet`) is kept and fed new data.
Everything else is rebuilt: the server in C# (ASP.NET Core, EF Core, Postgres, SignalR), the client in Next.js with TanStack Query and Zod.

## Done means
- [ ] A host can create a game (week mode or a 1-hour test mode), share a link and code, up to 8 friends join by name, and the host starts it.
- [ ] The galaxy is ~24 real systems around Sol. Enemy home is at the far edge. 10 objective planets sit between Earth and the enemy.
- [ ] Players can build mines, shipyards and Defense buildings, queue ships, research the 4 upgrades, send fleets, scout, colonize, trade with Haulers, and fight with the dice battle rules below.
- [ ] The enemy AI colonizes, builds ships and attacks; its attacks on Earth grow over time and scale with the player count.
- [ ] Fog of war and warnings work as written below, and a Discord webhook (optional per game) gets an alert for every spotted enemy fleet.
- [ ] Scoring, the 500-point target, the 1-week limit, the instant win (enemy home taken) and instant loss (Earth taken) all work, including the end screen.
- [ ] The browser updates live over SignalR. Nobody needs to refresh.
- [ ] The old single-player TS server, its API routes, the 15-ship list and the 9 elements are gone from the repo.
- [ ] A battle simulator (`server/Sim`) prints win rates for any two fleets, and the balance pass has used it.
- [ ] `ralph/check_full.sh` is green and `codequality` is at 90 or higher.

## The rules (the source of truth for the numbers; all of them live in one config so they can be tuned)

### Time
- One game = 7 days = 604,800 game seconds. Core works only in game seconds since the start. The server maps real time to game time with `TimeScale` (1 in week mode, 168 in the 1-hour test mode).
- Every trip has **5 minutes of launch and crew prep**, shown as part of the trip's timer, then the flight time.
- Flight time inside a system: crossing the whole system (Sun to Pluto, about 40 AU) takes about 1 hour for speed 1.0. Between systems the time grows with the square of the distance in light years: about 4 hours to the nearest star, 1 to 2 days to the enemy home world, for speed 1.0. Tune the constants once the galaxy exists. Divide by the ship's speed and by the Engines upgrade.
- Ships: Scout speed 3.0, Fighter 1.5, Hauler 1.0, Colony ship 1.0, Battleship 1.0, Dreadnought 0.6. A fleet moves at its slowest ship.
- Fleets can only fight at a planet when both sides are there. No fights in flight. A fleet in flight can be recalled (it returns to where it came from, using the time already flown).

### Resources (4)
Iron (Fe, basic), Hydrogen (H, fuel and gas), Titanium (Ti, uncommon), Helium-3 (He, rare). Each player has ONE stockpile (not per planet).
Mines add to it every game second, so the server gives players an up-to-date number whenever they ask.
Planets have a richness 0 to 100 for each element. Port the old 9-element data like this: Fe+Si+Al+C become Iron, O+H become Hydrogen, Ti stays, U+He become Helium-3.
Earth is rich in Iron, Hydrogen and Titanium and has almost no Helium-3; the gas giants (also in Sol) have it, so players have to expand and haul.

### Planets and buildings
- Planets are owned by one player, the enemy, or nobody. **Earth is the exception:** every player has their own holding there (their own mines, shipyard, defense) and treats it as their own base. Earth can never be captured by a player; it is lost if the enemy wins a battle there.
- Buildings (per planet, per holding): a **Mine** per element the planet has (levels 1 to 3), a **Shipyard** (builds ships on that planet), a **Defense building** (all of the owner's side's defenders fighting on that planet hit one number lower, roll of 1 always misses).
- Build queue per planet. Buildings and ships cost resources from the player's stockpile up front and take time.
- Starting numbers (tune in the balance pass): Mine L1 Fe 50, build 20 min, output 10 per hour times richness/100 times 2, each level costs x1.6 and takes x1.5, output x1.3. Shipyard Fe 100, 30 min. Defense Fe 100 Ti 20, 1 h.
- Colonizing: a Colony ship at a planet with no owner, or an enemy-owned planet with no enemy ships present, can claim it (the ship is used up). Claiming an enemy planet destroys everything on it first. Players cannot take planets from each other.

### Ships (6)
| Ship | Hits on (d6) | Shots | HP | Speed | Cost (starting) | Build time |
|---|---|---|---|---|---|---|
| Scout | no weapons | 0 | 1 | 3.0 | Fe 10, H 10 | 5 min |
| Hauler | no weapons, carries 100 of any mix | 0 | 1 | 1.0 | Fe 40, H 20 | 30 min |
| Colony ship | no weapons | 0 | 1 | 1.0 | Fe 80, H 60 | 1 h |
| Fighter | 5+ | 1 | 1 | 1.5 | Fe 20 | 10 min |
| Battleship | 4+ | 2 | 4 | 1.0 | Fe 60, Ti 20 | 45 min |
| Dreadnought | 3+ | 5 | 10 | 0.6 | Fe 200, Ti 150, He 100 (crazy expensive) | 4 h |

### Battle (dice)
- Fleets of every side at the planet fight as two sides: the defenders (owner side, plus every allied player's ships there) and the attackers. Friendly fleets that arrive before the battle is resolved fight together.
- Rounds repeat until one side has no ships with weapons left and no ships at all. Each round, both sides roll at the same time: each weapon ship rolls one d6 per shot. A roll of 1 always misses. A roll equal or higher than the ship's number is a hit.
- Each hit removes 1 HP from an enemy ship. Hits are assigned to enemy ships in this order: ships without weapons first, then Fighters, Battleships, Dreadnoughts (cheapest first, so a screen of cheap ships protects the big ones). Damage on a ship stays until it dies; surviving ships stay damaged and heal fully only while at a planet with a shipyard of their owner (over the next hour).
- The Defense building lowers the defenders' needed roll by 1 (a 3+ Dreadnought hits on 2+).
- All randomness comes from an `IDice` so tests can script it and the simulator can seed it.

### Upgrades (4, per player)
Engines (3 levels, +25% speed per level), Weapons (1 level: all your ships hit one number lower, a roll of 1 still misses), Armor (1 level: +1 HP for Fighters and Battleships), Mining (3 levels, +30% output per level). Costs use Ti and He and take hours; set them in the config.

### Visibility and warnings (fog of war)
- The map (systems, planets, composition) is public. Ships and fleets are not.
- The team shares vision. A player sees their own fleets and planets and every fleet of any player, and sees an **enemy fleet** as soon as its target system or its current system is within **one star hop** of any system where the team has a planet or a fleet (one hop = the same system or one of that system's 3 nearest neighbours). Scouts see 2 hops. When an enemy fleet becomes visible the game reveals its target and arrival time, and sends a Discord alert if a webhook is set.
- The planner decides nothing here: the enemy sees everything.

### Enemy AI (simple and tunable; one `EnemyConfig`)
- Pure function in Core: `EnemyBrain.Decide(state, dice, now)` returns orders; it runs inside `Advance`, so it is deterministic with a seed.
- It has a hidden income per owned planet per hour (no mines), spends it on ships at its planets, and keeps a garrison at its home world that regrows (taking the home world needs overwhelming force).
- **Colonize:** every few hours it sends a Colony ship with an escort to the nearest unclaimed system toward Earth.
- **Attack:** it targets the weakest visible-to-it player-held planet near its frontier when its fleet is at least 1.5 times as strong (strength = expected damage per round times HP). Otherwise it waits and builds.
- **Earth attacks:** the first no earlier than game hour 36 (fighters only), then every ~18 hours, each fleet worth about 1.35 times the last. Strength also scales with the player count (about +25% per extra player). Winning a battle at Earth with at least one ship alive means Earth is taken.
- It never retreats and does not sit idle; keep it explainable.

### Score and ending
- The team and the enemy each score 1 point per game hour for every objective planet they hold, plus 1 point the moment they capture one. The 10 objective planets sit between Earth and the enemy home world, spread over at least 6 systems. Neutral planets score for nobody.
- First side to **500 points** wins. The game also ends at exactly 1 week: highest score wins, and a tie goes to the enemy.
- **Instant win:** a Colony ship of the team claims the enemy home world (after the garrison is beaten). **Instant loss:** the enemy wins a battle at Earth.
- Players are one team; a per-player contribution table is shown on the end screen for fun.

### Start of the game
Each player starts at Earth with Fe 300, H 100, Ti 50, 4 Fighters, 1 Scout, 1 Colony ship and a level 1 Iron mine and a Shipyard on their Earth holding. Players can join only before the host starts the game.

### Galaxy
About 24 real systems closest to Sol from the existing star catalog (`lib/data`), including Sol with its real planets. Enemy home = the farthest system from Sol, with its biggest planet as the home world. The 10 objective planets are in systems between 30% and 70% of the distance from Sol to the enemy home, spread over at least 6 systems. Generation is deterministic from a seed.

## Milestones (build in this order)
- a. **Rules in C#** (Core): catalog of ships, buildings and upgrades; resources; dice battle resolver with scripted dice tests; the battle simulator.
- b. **World** (Core): galaxy generation from the existing data (24 systems, enemy home, 10 objectives), planets with the 4-element richness, travel time rules.
- c. **Economy and building** (Core): mine output, the stockpile, build queues, upgrades, the `Apply` command layer and `Advance` for completions.
- d. **Fleets** (Core): sending, flight, recall, arrival, battles, colonizing, trading with Haulers, visibility, reports.
- e. **Enemy and endgame** (Core): the AI, scoring, instant win and loss, end of week.
- f. **Server**: games and lobby, tokens, persistence, commands API, state and map endpoints, the game clock service, SignalR, Discord alerts, OpenAPI contract.
- g. **Client plumbing** (web): generated client and Zod schemas, TanStack Query, session, live updates; home page, lobby.
- h. **Game UI** (web): top bar, planet and building panels, shipyard and queue, fleet send with the trip timer, incoming-attack warnings, reports, upgrades, trade, end screen. Keep the renderer.
- i. **Cleanup**: delete the old TS server (`lib/server`, `app/api`), the old defs/economy files and their tests once nothing uses them; update README and `package.json` scripts (`npm run play` should start the new stack).
- j. **Balance and polish**: run the simulator, tune the numbers, fast test-mode game, docs.

## Non-goals
- Accounts, passwords, payments, matchmaking, more than one enemy faction, tech trees, more ship classes, planet-side combat or bases that shoot. Browser push notifications.
- Touching the look of the renderer. Changing the visual style of planets, stars or the galaxy map.

## Rules of the road
See `ralph/RULES.md` (code rules, the 90% quality target) and `ralph/CONTRACTS.md` (who owns what, the shared interfaces).
