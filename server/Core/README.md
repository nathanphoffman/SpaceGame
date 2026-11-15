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
