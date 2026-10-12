"use client";

import { useCallback, useEffect, useState } from "react";
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
  const planetName = (id: number) => game.planets.find((p) => p.id === id)?.name ?? "?";

  const r = rates(planet.buildings);
  const sec = Math.max(0, (now - game.now) / 1000);
  const metal = planet.metal + r.metal * sec;
  const crystal = planet.crystal + r.crystal * sec;

  const bQueue = game.queue.filter((q) => q.planetId === planet.id && q.kind === "building");
  const sQueue = game.queue.filter((q) => q.planetId === planet.id && q.kind === "ship");
  const shipyard = planet.buildings.shipyard ?? 0;
  const canAfford = (m: number, c: number) => metal >= m && crystal >= c;
  const activeFleets = game.fleets.filter((f) => f.status !== "done");
  const reports = game.fleets.filter((f) => f.report).slice(-6).reverse();

  const fleetPos = (f: GameState["fleets"][number]) => {
    const o = game.planets.find((p) => p.id === f.originId)!;
    const t = game.planets.find((p) => p.id === f.targetId)!;
    const [from, to, a, b] = f.status === "outbound" ? [o, t, f.departAt, f.arriveAt] : [t, o, f.arriveAt, f.returnAt];
    const k = Math.min(1, Math.max(0, (now - a) / (b - a)));
    const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 90;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, angle };
  };

  return (
    <>
      <div className="topbar">
        <h1>Space Game</h1>
        <div className="tabs">
          {mine.map((p) => (
            <button key={p.id} className={p.id === planet.id ? "on" : ""} onClick={() => setPlanetId(p.id)}>
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
            <h2>Galaxy map</h2>
            <div className="map">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                {activeFleets.map((f) => {
                  const o = game.planets.find((p) => p.id === f.originId)!;
                  const t = game.planets.find((p) => p.id === f.targetId)!;
                  return <line key={f.id} x1={o.x} y1={o.y} x2={t.x} y2={t.y} stroke="#4cc2ff55" strokeWidth="0.3" strokeDasharray="1 1" />;
                })}
              </svg>
              {game.planets.map((p) => (
                <button
                  key={p.id}
                  className={`node ${p.id === target?.id || p.id === planet.id ? "sel" : ""}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onClick={() => (p.kind === "player" ? setPlanetId(p.id) : setTargetId(p.id))}
                  title={p.name}
                >
                  <span className="icon"><img src={planetIcon(p)} alt="" /></span>
                  <span className="label">{p.kind === "empty" ? "Empty" : p.name}</span>
                </button>
              ))}
              {activeFleets.map((f) => {
                const pos = fleetPos(f);
                return (
                  <span key={f.id} className="fleet" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%,-50%) rotate(${pos.angle}deg)` }}>
                    <img src={f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon} alt="" />
                  </span>
                );
              })}
            </div>
            <div className="dim" style={{ marginTop: 8 }}>Solid = yours · ringed = enemy · dashed = empty (colonize). Click a planet to target it.</div>
          </div>

          <div className="panel">
            <h2>Fleet {target ? `→ ${target.name}` : ""}</h2>
            {!target ? (
              <div className="dim">Click an enemy or empty planet on the map to send ships.</div>
            ) : (
              <>
                <div className="dim" style={{ marginBottom: 6 }}>
                  {target.kind === "npc" ? `Attack · enemy defense ${target.defense}` : "Colonize · needs a Colony Ship"}
                  {" · "}flight {fmtTime(flightSeconds(planet, target) * 1000)} each way
                </div>
                {(Object.keys(SHIPS) as ShipType[]).map((t) => (
                  <div className="row" key={t}>
                    <span className="icon"><img src={SHIPS[t].icon} alt="" /></span>
                    <span className="grow">{SHIPS[t].name} <span className="sub">({planet.ships[t] ?? 0} available)</span></span>
                    <input type="number" min={0} max={planet.ships[t] ?? 0} value={sendQty[t] ?? 0}
                      onChange={(e) => setSendQty({ ...sendQty, [t]: Number(e.target.value) })} />
                  </div>
                ))}
                <button style={{ marginTop: 8 }} onClick={async () => { await act({ action: "send", originId: planet.id, targetId: target.id, ships: sendQty }); setSendQty({}); }}>
                  Send fleet
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          {error && <div className="panel err">{error}</div>}

          <div className="panel">
            <h2>{planet.name} — buildings</h2>
            {(Object.keys(BUILDINGS) as BuildingType[]).map((t) => {
              const q = bQueue.filter((x) => x.type === t);
              const level = (planet.buildings[t] ?? 0) + q.length;
              const cost = buildCost(t, level);
              const active = q[0];
              return (
                <div className="row" key={t}>
                  <span className="icon"><img src={BUILDINGS[t].icon} alt="" /></span>
                  <div className="grow">
                    <b>{BUILDINGS[t].name}</b> <span className="dim">Lv {planet.buildings[t] ?? 0}{q.length ? ` → ${level}` : ""}</span>
                    <div className="sub"><Cost metal={cost.metal} crystal={cost.crystal} /> · {fmtTime(buildSeconds(t, level) * 1000)} · {BUILDINGS[t].desc}</div>
                    {active && (
                      <>
                        <div className="sub good">Building… {fmtTime(active.finishAt - now)}</div>
                        <div className="bar"><div style={{ width: `${Math.min(100, ((now - active.startAt) / (active.finishAt - active.startAt)) * 100)}%` }} /></div>
                      </>
                    )}
                  </div>
                  <button disabled={!canAfford(cost.metal, cost.crystal)} onClick={() => act({ action: "build", planetId: planet.id, type: t })}>Upgrade</button>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h2>Shipyard {shipyard ? `(Lv ${shipyard})` : ""}</h2>
            {!shipyard && <div className="dim">Build a shipyard to start building ships.</div>}
            {(Object.keys(SHIPS) as ShipType[]).map((t) => {
              const s = SHIPS[t];
              const qty = shipQty[t] ?? 1;
              const inQueue = sQueue.filter((x) => x.type === t);
              return (
                <div className="row" key={t}>
                  <span className="icon"><img src={s.icon} alt="" /></span>
                  <div className="grow">
                    <b>{s.name}</b> <span className="dim">×{planet.ships[t] ?? 0}</span>
                    <div className="sub"><Cost metal={s.cost.metal} crystal={s.cost.crystal} /> · {fmtTime(shipSeconds(t, shipyard) * 1000)} each · Attack {s.attack} · Cargo {s.cargo}</div>
                    {inQueue[0] && <div className="sub good">Building {inQueue.length}… next in {fmtTime(inQueue[0].finishAt - now)}</div>}
                  </div>
                  <input type="number" min={1} max={20} value={qty} onChange={(e) => setShipQty({ ...shipQty, [t]: Number(e.target.value) })} />
                  <button disabled={!shipyard || !canAfford(s.cost.metal * qty, s.cost.crystal * qty)}
                    onClick={() => act({ action: "ship", planetId: planet.id, type: t, qty })}>Build</button>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h2>Fleets in flight</h2>
            {activeFleets.length === 0 && <div className="dim">None.</div>}
            {activeFleets.map((f) => (
              <div className="row" key={f.id}>
                <span className="icon"><img src={f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon} alt="" /></span>
                <div className="grow">
                  {f.status === "outbound" ? `${f.mission === "colonize" ? "Colonizing" : "Attacking"} ${planetName(f.targetId)}` : `Returning to ${planetName(f.originId)}`}
                  <div className="sub"><ShipList ships={f.ships} />{f.loot.metal + f.loot.crystal > 0 && <> · loot <Cost metal={f.loot.metal} crystal={f.loot.crystal} /></>}</div>
                </div>
                <b>{fmtTime((f.status === "outbound" ? f.arriveAt : f.returnAt) - now)}</b>
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
