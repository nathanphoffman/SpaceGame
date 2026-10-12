"use client";

import { useCallback, useEffect, useState } from "react";
import PlanetView from "@/components/PlanetView";
import { planetThumb, thumbDisplaySize } from "@/components/planetThumb";
import { describePlanet, planetParams, starParams } from "@/lib/planetGen";
import {
  BUILDINGS, SHIPS, buildCost, buildSeconds, shipSeconds, rates, flightSeconds,
  type BuildingType, type ShipType, type GameState, type PlanetDTO,
} from "@/lib/defs";

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const planetIcon = (p: PlanetDTO) => `/icons/planet_${p.kind === "player" ? "player" : p.kind === "npc" ? "enemy" : "empty"}.svg`;

// eslint-disable-next-line @next/next/no-img-element
const Ico = ({ src, big }: { src: string; big?: boolean }) => <img src={src} alt="" className={big ? "ico big" : "ico"} />;
const Cost = ({ metal, crystal }: { metal: number; crystal: number }) => (
  <>
    <Ico src="/icons/metal.svg" /> {metal} <Ico src="/icons/crystal.svg" /> {crystal}
  </>
);
const ShipList = ({ ships }: { ships: Record<string, number> }) => {
  const list = Object.entries(ships).filter(([, n]) => n > 0);
  if (list.length === 0) return <>—</>;
  return <>{list.map(([t, n]) => <span key={t}><Ico src={SHIPS[t as ShipType].icon} /> ×{n} </span>)}</>;
};

export default function Page() {
  const [game, setGame] = useState<GameState | null>(null);
  const [offset, setOffset] = useState(0); // server clock - client clock
  const [clock, setClock] = useState(Date.now());
  const [planetId, setPlanetId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [systemId, setSystemId] = useState<number | null>(null); // system shown on the solar map
  const [shipQty, setShipQty] = useState<Record<string, number>>({});
  const [sendQty, setSendQty] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const apply = (g: GameState) => {
    setGame(g);
    setOffset(g.now - Date.now());
  };
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/state");
      if (r.ok) apply(await r.json());
      else setError((await r.json()).error ?? "Could not load game (is the database running?)");
    } catch {
      setError("Could not reach server");
    }
  }, []);

  useEffect(() => {
    refresh();
    const a = setInterval(refresh, 2000);
    const b = setInterval(() => setClock(Date.now()), 250);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  const act = async (body: object) => {
    const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setError(j.error);
    else { setError(""); apply(j); }
  };

  if (!game) return <div style={{ padding: 24 }}>{error || "Loading…"}</div>;

  const now = clock + offset;
  const mine = game.planets.filter((p) => p.kind === "player");
  const planet = mine.find((p) => p.id === planetId) ?? mine[0];
  const target = game.planets.find((p) => p.id === targetId && p.kind !== "player") ?? null;
  const viewed = game.planets.find((p) => p.id === viewId) ?? planet;
  const viewedInfo = describePlanet(planetParams(viewed.seed));
  const planetName = (id: number) => game.planets.find((p) => p.id === id)?.name ?? "?";

  const r = rates(planet.buildings);
  const sec = Math.max(0, (now - game.now) / 1000);
  const metal = planet.metal + r.metal * sec;
  const crystal = planet.crystal + r.crystal * sec;

  const bQueue = game.queue.filter((q) => q.planetId === planet.id && q.kind === "building");
  const sQueue = game.queue.filter((q) => q.planetId === planet.id && q.kind === "ship");
  const shipyard = planet.buildings.shipyard ?? 0;
  // why something can't be bought right now (undefined = it can), used for the disabled-button tooltips
  const shortfall = (m: number, c: number) => {
    const missing = [
      metal < m && `${Math.ceil(m - metal)} more metal`,
      crystal < c && `${Math.ceil(c - crystal)} more crystal`,
    ].filter(Boolean);
    return missing.length ? `Not enough resources: need ${missing.join(" and ")}` : undefined;
  };
  const activeFleets = game.fleets.filter((f) => f.status !== "done");
  const reports = game.fleets.filter((f) => f.report).slice(-6).reverse();

  const sysOf = (id: number) => game.systems.find((x) => x.id === id)!;
  const shownSystem = sysOf(systemId ?? viewed.systemId);
  const star = starParams(shownSystem.seed);
  const systemPlanets = game.planets.filter((p) => p.systemId === shownSystem.id);

  // flight progress 0..1 and the planets it is currently travelling between
  const flight = (f: GameState["fleets"][number]) => {
    const o = game.planets.find((p) => p.id === f.originId)!;
    const t = game.planets.find((p) => p.id === f.targetId)!;
    const [from, to, a, b] = f.status === "outbound" ? [o, t, f.departAt, f.arriveAt] : [t, o, f.arriveAt, f.returnAt];
    return { from, to, k: Math.min(1, Math.max(0, (now - a) / (b - a))) };
  };
  const flying = activeFleets.filter((f) => f.status !== "stationed");
  const crossFleets = flying.filter((f) => game.planets.find((p) => p.id === f.originId)!.systemId !== game.planets.find((p) => p.id === f.targetId)!.systemId);
  const localFleets = flying.filter((f) => !crossFleets.includes(f) && game.planets.find((p) => p.id === f.originId)!.systemId === shownSystem.id);

  // solar map: distance from the star in AU on a compressed (square-root) scale
  const AU_MAX = 12;
  const solarX = (au: number) => 12 + Math.sqrt(au / AU_MAX) * 84;
  const starRgb = `rgb(${star.color.map((c) => Math.round(c * 255)).join(",")})`;
  const sunSize = 70 + 40 * star.size;

  return (
    <>
      <div className="topbar">
        <h1>Space Game</h1>
        <div className="tabs">
          {mine.map((p) => (
            <button key={p.id} className={p.id === planet.id ? "on" : ""} onClick={() => { setPlanetId(p.id); setViewId(p.id); setSystemId(null); }}>
              <Ico src="/icons/planet_player.svg" /> {p.name}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="res"><Ico src="/icons/metal.svg" /> <b>{Math.floor(metal)}</b> <small>+{r.metal.toFixed(1)}/s</small></div>
        <div className="res"><Ico src="/icons/crystal.svg" /> <b>{Math.floor(crystal)}</b> <small>+{r.crystal.toFixed(1)}/s</small></div>
        <button className="ghost" onClick={() => confirm("Reset the whole game?") && act({ action: "reset" })}>Reset</button>
      </div>

      <div className="layout">
        <div>
          <div className="panel">
            <h2>{viewed.name}</h2>
            <PlanetView seed={viewed.seed} />
            <div className="planet-info">
              <div><b>{viewedInfo.type}</b> · {viewedInfo.size} · {viewedInfo.surface}</div>
              <div className="dim">
                {viewedInfo.craters > 0 ? `${viewedInfo.craters} craters` : "No craters"} · {viewedInfo.rings ? "Rings" : "No rings"} · {viewedInfo.atmosphere ? "Atmosphere" : "No atmosphere"}
              </div>
              <div className="dim">
                {viewed.kind === "player" ? "Your planet" : viewed.kind === "npc" ? `Enemy · defense ${viewed.defense}` : "Unclaimed"} · seed {viewed.seed}
              </div>
              {activeFleets.filter((f) => f.status === "stationed" && f.targetId === viewed.id).map((f) => (
                <div key={f.id} className="good">Guarded by your fleet: <ShipList ships={f.ships} /></div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Solar system — {shownSystem.name} <span className="dim">({star.label})</span></h2>
            <div className="solar">
              <div className="sun" style={{ width: sunSize, height: sunSize, left: -sunSize * 0.55, background: `radial-gradient(circle at 70% 50%, #fff 0, ${starRgb} 35%, ${starRgb}55 70%, transparent 72%)`, boxShadow: `0 0 40px 10px ${starRgb}55` }} />
              <div className="plane" />
              {[1, 2, 4, 8].map((au) => (
                <div key={au} className="tick" style={{ left: `${solarX(au)}%` }}><span>{au} AU</span></div>
              ))}
              {systemPlanets.map((p, i) => {
                const body = 14 + planetParams(p.seed).radius * 16; // planet diameter in px
                const size = thumbDisplaySize(p.seed, body);
                return (
                  <button key={p.id} className={`snode ${p.id === viewed.id ? "sel" : ""} ${i % 2 ? "below" : "above"}`}
                    style={{ left: `${solarX(p.orbit)}%`, ["--body" as string]: `${body}px` }}
                    onClick={() => {
                      setViewId(p.id);
                      if (p.kind === "player") setPlanetId(p.id);
                      else setTargetId(p.id);
                    }}
                    title={`${p.name} · ${p.orbit.toFixed(1)} AU`}>
                    <img className="thumb" src={planetThumb(p.seed)} alt="" style={{ width: size, height: size }} />
                    <span className={`dot ${p.kind}`} />
                    {activeFleets.some((f) => f.status === "stationed" && f.targetId === p.id) && (
                      <img className="guard" src={SHIPS.fighter.icon} alt="guarded" />
                    )}
                    <span className="label">{p.name}<small>{p.orbit.toFixed(1)} AU</small></span>
                  </button>
                );
              })}
              {localFleets.map((f) => {
                const { from, to, k } = flight(f);
                const x = solarX(from.orbit) + (solarX(to.orbit) - solarX(from.orbit)) * k;
                const heading = solarX(to.orbit) >= solarX(from.orbit) ? 90 : -90;
                return (
                  <span key={f.id} className="fleet" style={{ left: `${x}%`, top: "50%", transform: `translate(-50%,-50%) rotate(${heading}deg)` }}>
                    <img src={f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon} alt="" />
                  </span>
                );
              })}
            </div>
            <div className="dim" style={{ marginTop: 8 }}><b className="mine">●</b> yours · <b className="foe">●</b> enemy · no dot = neutral (colonize or guard). Distance from the star is compressed. Click a planet to view/target it.</div>
          </div>

          <div className="panel">
            <h2>Galaxy map</h2>
            <div className="map galaxy">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                {crossFleets.map((f) => {
                  const { from, to } = flight(f);
                  const a = sysOf(from.systemId), b = sysOf(to.systemId);
                  return <line key={f.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4cc2ff55" strokeWidth="0.4" strokeDasharray="1.5 1.5" />;
                })}
              </svg>
              {game.systems.map((sy) => {
                const st = starParams(sy.seed);
                const rgb = `rgb(${st.color.map((c) => Math.round(c * 255)).join(",")})`;
                const owned = mine.filter((p) => p.systemId === sy.id).length;
                const d = 10 + st.size * 8;
                return (
                  <button key={sy.id} className={`gnode ${sy.id === shownSystem.id ? "sel" : ""}`} style={{ left: `${sy.x}%`, top: `${sy.y}%` }}
                    onClick={() => setSystemId(sy.id)} title={`${sy.name} · ${st.label}`}>
                    <span className="star" style={{ width: d, height: d, background: rgb, boxShadow: `0 0 ${d}px ${d / 3}px ${rgb}66` }} />
                    <span className="label">{sy.name}{owned > 0 && <b className="mine"> ● {owned}</b>}</span>
                  </button>
                );
              })}
              {crossFleets.map((f) => {
                const { from, to, k } = flight(f);
                const a = sysOf(from.systemId), b = sysOf(to.systemId);
                const angle = (Math.atan2(b.y - a.y, (b.x - a.x) * 1.6) * 180) / Math.PI + 90;
                return (
                  <span key={f.id} className="fleet" style={{ left: `${a.x + (b.x - a.x) * k}%`, top: `${a.y + (b.y - a.y) * k}%`, transform: `translate(-50%,-50%) rotate(${angle}deg)` }}>
                    <img src={f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon} alt="" />
                  </span>
                );
              })}
            </div>
            <div className="dim" style={{ marginTop: 8 }}>Click a star to open its solar system. <b className="mine">●</b> = your bases there.</div>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Fleet {target ? `→ ${target.name}` : ""}</h2>
            {!target ? (
              <div className="dim">Click an enemy or empty planet on the solar map to send ships.</div>
            ) : (
              <>
                <div className="dim" style={{ marginBottom: 6 }}>
                  {target.kind === "npc"
                    ? `Attack · enemy defense ${target.defense} · survivors guard the planet`
                    : (sendQty.colony_ship ?? 0) > 0 ? "Colonize" : "Guard · add a Colony Ship to settle it"}
                  {" · "}flight {fmtTime(flightSeconds(planet, target, game.systems) * 1000)} each way
                </div>
                {(Object.keys(SHIPS) as ShipType[]).map((t) => (
                  <div className="row" key={t}>
                    <span className="icon"><img src={SHIPS[t].icon} alt="" /></span>
                    <span className="grow">{SHIPS[t].name} <span className="sub">({planet.ships[t] ?? 0} available)</span></span>
                    <input type="number" min={0} max={planet.ships[t] ?? 0} value={sendQty[t] ?? 0}
                      onChange={(e) => setSendQty({ ...sendQty, [t]: Number(e.target.value) })} />
                  </div>
                ))}
                <button style={{ marginTop: 8 }} onClick={async () => { await act({ action: "send", originId: planet.id, targetId: target.id, ships: sendQty });
                  setSendQty({});
                  setViewId(planet.id); // back to your base so its buildings/shipyard show again
                }}>
                  Send fleet
                </button>
              </>
            )}
          </div>

          {error && <div className="panel err">{error}</div>}

          {viewed.kind === "player" && (
            <>
            <div className="panel">
              <h2>{planet.name} — buildings</h2>
              <div className="tiles">
                {(Object.keys(BUILDINGS) as BuildingType[]).map((t) => {
                  const q = bQueue.filter((x) => x.type === t);
                  const level = (planet.buildings[t] ?? 0) + q.length;
                  const cost = buildCost(t, level);
                  const active = q[0];
                  return (
                    <div className="tile" key={t} title={BUILDINGS[t].desc}>
                      <img className="tile-icon" src={BUILDINGS[t].icon} alt="" />
                      <b>{BUILDINGS[t].name}</b>
                      <span className="dim">Lv {planet.buildings[t] ?? 0}{q.length ? ` → ${level}` : ""}</span>
                      <div className="sub"><Cost metal={cost.metal} crystal={cost.crystal} /></div>
                      <div className="sub">{fmtTime(buildSeconds(t, level) * 1000)}</div>
                      {active && (
                        <div className="grow-fill">
                          <div className="sub good">{fmtTime(active.finishAt - now)}</div>
                          <div className="bar"><div style={{ width: `${Math.min(100, ((now - active.startAt) / (active.finishAt - active.startAt)) * 100)}%` }} /></div>
                        </div>
                      )}
                      {(() => {
                        const why = shortfall(cost.metal, cost.crystal);
                        return (
                          <button disabled={!!why} title={why} onClick={() => act({ action: "build", planetId: planet.id, type: t })}>Upgrade</button>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel">
              <h2>Shipyard {shipyard ? `(Lv ${shipyard})` : ""}</h2>
              {!shipyard && <div className="dim">Build a shipyard to start building ships.</div>}
              <div className="tiles">
                {(Object.keys(SHIPS) as ShipType[]).map((t) => {
                  const s = SHIPS[t];
                  const qty = shipQty[t] ?? 1;
                  const inQueue = sQueue.filter((x) => x.type === t);
                  return (
                    <div className="tile" key={t}>
                      <img className="tile-icon" src={s.icon} alt="" />
                      <b>{s.name}</b>
                      <span className="dim">×{planet.ships[t] ?? 0} · Atk {s.attack} · Cargo {s.cargo}</span>
                      <div className="sub"><Cost metal={s.cost.metal} crystal={s.cost.crystal} /></div>
                      <div className="sub">{fmtTime(shipSeconds(t, shipyard) * 1000)} each</div>
                      {inQueue[0] && <div className="sub good">+{inQueue.length} · next {fmtTime(inQueue[0].finishAt - now)}</div>}
                      <div className="tile-actions">
                        <input type="number" min={1} max={20} value={qty} onChange={(e) => setShipQty({ ...shipQty, [t]: Number(e.target.value) })} />
                        {(() => {
                          const why = !shipyard
                            ? "Build a Shipyard first"
                            : !(qty >= 1 && qty <= 20)
                              ? "Quantity must be between 1 and 20"
                              : shortfall(s.cost.metal * qty, s.cost.crystal * qty);
                          return (
                            <button disabled={!!why} title={why} onClick={() => act({ action: "ship", planetId: planet.id, type: t, qty })}>Build</button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
          )}

          <div className="panel">
            <h2>Fleets</h2>
            {activeFleets.length === 0 && <div className="dim">None.</div>}
            {activeFleets.map((f) => (
              <div className="row" key={f.id}>
                <span className="icon"><img src={f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon} alt="" /></span>
                <div className="grow">
                  {f.status === "outbound" ? `${f.mission === "colonize" ? "Colonizing" : "Attacking"} ${planetName(f.targetId)}`
                    : f.status === "stationed" ? `Guarding ${planetName(f.targetId)}`
                    : `Returning to ${planetName(f.originId)}`}
                  <div className="sub"><ShipList ships={f.ships} />{f.loot.metal + f.loot.crystal > 0 && <> · loot <Cost metal={f.loot.metal} crystal={f.loot.crystal} /></>}</div>
                </div>
                {f.status === "stationed"
                  ? <button className="ghost" onClick={() => act({ action: "recall", fleetId: f.id })}>Recall</button>
                  : <b>{fmtTime((f.status === "outbound" ? f.arriveAt : f.returnAt) - now)}</b>}
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Reports</h2>
            {reports.length === 0 && <div className="dim">No reports yet.</div>}
            {reports.map((f) => <div className="report" key={f.id}>{f.report}</div>)}
          </div>
        </div>
      </div>
    </>
  );
}
