# SpaceGame.Core

Plain game rules, no I/O. Time is an argument (game seconds), randomness comes from `IDice`.
Every SPEC.md number lives in a config record under `Rules/`.

## Where each rule lives

| SPEC section | Rule | Where |
|---|---|---|
| Time | Week length (604,800 s) | `GameConfig.WeekSeconds` |
| Time | 5 min launch prep | `GameConfig.PrepSeconds` |
| Time | Flight time in a system / between systems | `GameConfig.Travel` (`TravelConfig.SecondsPerAu`, `SecondsPerLySquared`), formulas in `Rules/TravelRules.cs` |
| Time | Ship speeds | `Catalog.Default` ships (`Rules/Catalog.cs`) |
| Resources | Mine output, level growth | `Catalog.Mine` (`MineRules`), mine entry in `Catalog.Buildings` |
| Buildings | Mine, Shipyard, Defense cost and time | `Catalog.Default` buildings |
| Buildings | Defense bonus (one number lower) | `GameConfig.DefenseBonus` |
| Ships | Hit number, shots, HP, speed, cost, build time, cargo | `Catalog.Default` ships |
| Battle | Dice rounds, hit order | `Rules/Battle.cs` |
| Battle | Healing at a shipyard | `GameConfig.HealSeconds`, `Rules/ShipDamage.cs` |
| Upgrades | Engines, Weapons, Armor, Mining | `Catalog.Default` upgrades, applied in `Rules/Upgrades.cs` |
| Fog of war | One hop, scouts two hops | `Fleets/Visibility.cs`, `World/StarHops.cs` |
| Enemy AI | Tick, income, garrison, escort | `EnemyConfig.TickSeconds`, `IncomePerPlanetPerTick`, `HomeGarrisonFighters`, `EscortFighters` |
| Enemy AI | Attack at 1.5x strength | `EnemyConfig.AttackStrengthRatio` |
| Enemy AI | Enemy sight | `EnemyConfig.SightHops` |
| Enemy AI | Earth attacks (hour 36, every 18 h, x1.35, +25% per player) | `EnemyConfig.FirstEarthAttackSeconds`, `EarthAttackIntervalSeconds`, `FirstEarthAttackFighters`, `EarthAttackGrowth`, `EarthAttackPerExtraPlayer` |
| Score | 500 points to win | `GameConfig.ScoreTarget`, logic in `Engine/Scoring.cs` |
| Score | Week end, instant win/loss | `Engine/Endgame.cs` |
| Start | Starting stock and ships | `State/StartingKit.cs` |

## Battle simulator (`server/Sim`)

```
dotnet run --project server/Sim -- fight "<count> <ship>, ..." "<count> <ship>, ..." [--runs N] [--defense] [--weapons] [--seed S]
```

- First fleet attacks, second defends.
- `--runs N`: number of fights (default 1000).
- `--defense`: defenders have a Defense building.
- `--weapons`: defenders have the Weapons upgrade.
- `--seed S`: dice seed (default 1), so the same command gives the same result.

Example:

```
dotnet run --project server/Sim -- fight "1 dreadnought" "1 battleship" --runs 2000 --defense --weapons --seed 7
```

## Final balance numbers

Ship, building and upgrade numbers are in `Catalog.Default`. Game and enemy numbers (defaults):
week 604,800 s, 500 points to win, 5 min launch prep, heal 1 h, defense bonus 1; enemy tick 1 h,
40 income per planet per tick, home garrison 10 fighters, 4 escort fighters, attack at 1.5x strength,
sight 2 hops, first Earth attack at hour 36 with 6 fighters, every 18 h, x1.35 each time, +25% per extra player.

## What a test-mode game looks like

Test mode runs at `TimeScale` 168 (one real hour is one game week, one game hour is about 21 real seconds).
Run from the engine with seed 1, one player who does nothing:

- Hour 1: enemy buys its home garrison. Hour 6: it sends a Colony ship plus escort to the nearest free system.
- Hour 33 and 54: the enemy claims two planets (`PlanetCaptured`, `FleetArrived`).
- Hour 36: first Earth attack launches (`LaunchEarthAttack`, 6 fighters) and is seen as `FleetSpotted`.
  Hour 54: second attack launches (8 fighters, 6 x 1.35).
- Hour 56.6: the first attack lands (`BattleResolved`) and, with no defense, Earth falls (`GameEnded`, enemy wins, `earthLost`).
- Event counts over the run: EnemyOrder 8, FleetSpotted 5, FleetArrived 3, PlanetCaptured 2, BattleResolved 1, GameEnded 1.

So the first Earth attack is at hour 36 (about 13 real minutes in) and a player who ignores Earth loses at hour 56.6
(about 20 real minutes in). An active player needs Earth defenses and fighters by then.

## Earth attack check, wave by wave (TimeScale 168)

```
dotnet run --project server/Sim -- waves "6 fighter, 2 battleship" --timescale 168 --waves 6 [--defense] [--weapons] [--players N]
```

One fixed defense (6 fighters and 2 battleships, 1 player, 1000 runs, seed 1) against each scheduled attack:

| Wave | Launch hour | Real minute | Attackers | Defense held (no extras) | Defense held (Defense building + Weapons) |
|---|---|---|---|---|---|
| 1 | 36 | 12.9 | 6 | 100.0% | 100.0% |
| 2 | 54 | 19.3 | 8 | 99.8% | 100.0% |
| 3 | 72 | 25.7 | 11 | 86.9% | 99.9% |
| 4 | 90 | 32.1 | 15 | 22.4% | 89.5% |
| 5 | 108 | 38.6 | 20 | 0.7% | 19.5% |
| 6 | 126 | 45.0 | 27 | 0.0% | 0.0% |

The numbers look right: a small defense holds the first waves, and the x1.35 growth forces a player to keep building
(by wave 4 a static fleet needs the Defense building and Weapons, by wave 6 it needs a bigger fleet). No config change.

## 4 and 8 players (TimeScale 168)

Same fixed defense as above (6 fighters and 2 battleships, 1000 runs, seed 1), `--players 4` and `--players 8`.
Defense held, no extras / with Defense building + Weapons:

| Wave | Launch hour | 4 players: attackers | 4 players: held | 8 players: attackers | 8 players: held |
|---|---|---|---|---|---|
| 1 | 36 | 10 | 94.1% / 100.0% | 16 | 12.1% / 78.2% |
| 2 | 54 | 14 | 34.3% / 95.0% | 22 | 0.1% / 5.5% |
| 3 | 72 | 19 | 0.7% / 30.6% | 30 | 0.0% / 0.0% |
| 4 | 90 | 26 | 0.0% / 0.2% | 41 | 0.0% / 0.0% |
| 5 | 108 | 35 | 0.0% / 0.0% | 55 | 0.0% / 0.0% |
| 6 | 126 | 47 | 0.0% / 0.0% | 74 | 0.0% / 0.0% |

The starting defense alone survives wave 1 with 4 players but not with 8, which is intended: more players
share Earth's defense and bring more ships. Waves threaten at every size and none beats a sensible
shared defense on wave 1 to 2. No config change.
