import {
  MAX_BUILDING_LEVEL, buildCost, buildSeconds, buildingInfo, mineElement, mineRate, toRoman,
  type PlanetDTO, type QueueDTO, type Res,
} from "@/lib/defs";
import { Cost, elementColor, fmtTime } from "./ui";

type Props = {
  planet: PlanetDTO;
  composition: { symbol: string; pct: number }[];
  types: string[]; // building types this planet can build
  queue: QueueDTO[]; // building queue for this planet
  now: number;
  shortfall: (cost: Res) => string | undefined;
  act: (body: object) => Promise<void>;
};

export default function Buildings({ planet, composition, types, queue, now, shortfall, act }: Props) {
  return (
    <div className="panel">
      <h2>{planet.name} — buildings</h2>
      <div className="tiles">
        {types.map((t) => {
          const info = buildingInfo(t)!;
          const q = queue.filter((x) => x.type === t);
          const built = planet.buildings[t] ?? 0;
          const level = built + q.length;
          const cost = buildCost(t, level);
          const active = q[0];
          const maxed = level >= MAX_BUILDING_LEVEL;
          const unbuilt = built === 0;
          const why = maxed ? `Already at the maximum level (${toRoman(MAX_BUILDING_LEVEL)})` : shortfall(cost);
          const el = mineElement(t);
          const pct = composition.find((c) => c.symbol === el)?.pct ?? 0;
          return (
            <div className="tile" key={t} title={info.desc}>
              <div className="tile-top">
                <div className="tile-head">
                  {el ? (
                    // greyscale icon tinted with the element's colour (same colour as the composition bar)
                    <span className="tile-icon tinted" style={{ background: elementColor(el), WebkitMaskImage: `url(${info.icon})`, maskImage: `url(${info.icon})` }}>
                      <img src={info.icon} alt="" />
                    </span>
                  ) : (
                    <img className="tile-icon" src={info.icon} alt="" />
                  )}
                  <b>{info.name}{!unbuilt && <span className="dim"> ({toRoman(built)})</span>}</b>
                </div>
                {unbuilt && <span className="notbuilt">(Not Built Yet)</span>}
              </div>
              <div className="dots" title={`Level ${built}${q.length ? `, upgrading to ${level}` : ""}`}>
                {Array.from({ length: level }, (_, i) => (
                  <span key={i} className={`dot-level ${i < built ? "on" : "queued"}`} />
                ))}
              </div>
              {el && (
                <div className="sub" title={`${el} makes up ${pct}% of this planet; richer deposits yield more per level`}>
                  <b style={{ color: elementColor(el) }}>{el}</b> {pct}% · +{mineRate(built, pct).toFixed(1)}/s
                  {level < MAX_BUILDING_LEVEL && <> → +{mineRate(level + 1, pct).toFixed(1)}/s</>}
                </div>
              )}
              {maxed ? (
                <div className="sub good">Maximum level</div>
              ) : (
                <>
                  <div className="sub">Cost: <Cost cost={cost} /></div>
                  <div className="sub">{fmtTime(buildSeconds(t, level) * 1000)}</div>
                </>
              )}
              {active && (
                <div className="grow-fill">
                  <div className="sub good">{fmtTime(active.finishAt - now)}</div>
                  <div className="bar"><div style={{ width: `${Math.min(100, ((now - active.startAt) / (active.finishAt - active.startAt)) * 100)}%` }} /></div>
                </div>
              )}
              <button disabled={!!why} title={why} onClick={() => act({ action: "build", planetId: planet.id, type: t })}>{maxed ? "Max level" : unbuilt ? "Build" : "Upgrade"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
