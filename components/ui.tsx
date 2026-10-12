import { ELEMENTS, SHIPS, type Element, type FleetDTO, type Res, type ShipType } from "@/lib/defs";

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const elementColor = (sym: string) => ELEMENTS[sym as Element]?.color ?? "#777";

export const SHIP_TYPES = Object.keys(SHIPS) as ShipType[];

/** icon shown for a fleet on the maps and in the fleet list */
export const fleetIcon = (f: FleetDTO) => (f.mission === "colonize" ? SHIPS.colony_ship.icon : SHIPS.fighter.icon);

// eslint-disable-next-line @next/next/no-img-element
export const Ico = ({ src, big }: { src: string; big?: boolean }) => <img src={src} alt="" className={big ? "ico big" : "ico"} />;

/** a bundle of resources as coloured element symbols, e.g. "Fe 60  Si 15" */
export const Cost = ({ cost }: { cost: Res }) => (
  <>
    {Object.entries(cost).filter(([, n]) => n > 0).map(([el, n]) => (
      <span key={el} className="cost" title={ELEMENTS[el as Element]?.name}>
        <b style={{ color: elementColor(el) }}>{el}</b> {Math.round(n)}
      </span>
    ))}
  </>
);

export const ShipList = ({ ships }: { ships: Record<string, number> }) => {
  const list = Object.entries(ships).filter(([, n]) => n > 0);
  if (list.length === 0) return <>—</>;
  return <>{list.map(([t, n]) => <span key={t}><Ico src={SHIPS[t as ShipType].icon} /> ×{n} </span>)}</>;
};
