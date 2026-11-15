import { Cost, elementColor, fmtTime } from "@/components/ui";
import {
	type BuildingInfo,
	buildCost,
	buildingInfo,
	buildSeconds,
	MAX_BUILDING_LEVEL,
	MS_PER_SECOND,
	mineElement,
	mineRate,
	type PlanetDTO,
	type QueueDTO,
	type Resources,
	toRoman,
} from "@/lib/defs";

import Image from "next/image";
import { ICON_BOX_PX } from "@/components/iconBox";

const PERCENT = 100;

type Props = {
	planet: PlanetDTO;
	composition: { symbol: string; pct: number }[];
	types: string[]; // building types this planet can build
	queue: QueueDTO[]; // building queue for this planet
	nowMs: number;
	shortfall: (cost: Resources) => string | undefined;
	sendAction: (body: object) => Promise<void>;
};

type TileState = {
	type: string;
	info: BuildingInfo;
	built: number;
	level: number;
	queued: QueueDTO[];
	element: string | null;
	pct: number;
};

/** the icon, tinted with the element's colour (the same colour as the composition bar) when the building is a mine */
function TileIcon({
	info,
	element,
}: {
	info: BuildingInfo;
	element: string | null;
}) {
	if (!element) return <Image unoptimized width={ICON_BOX_PX} height={ICON_BOX_PX} className="tile-icon" src={info.icon} alt="" />;

	return (
		<span
			className="tile-icon tinted"
			style={{
				background: elementColor(element),
				WebkitMaskImage: `url(${info.icon})`,
				maskImage: `url(${info.icon})`,
			}}

		>
			<Image unoptimized width={ICON_BOX_PX} height={ICON_BOX_PX} src={info.icon} alt="" />
		</span>
	);
}

function TileHead({ tile }: { tile: TileState }) {
	const unbuilt = tile.built === 0;

	return (
		<div className="tile-top">
			<div className="tile-head">
				<TileIcon info={tile.info} element={tile.element} />
				<b>
					{tile.info.name}
					{!unbuilt && <span className="dim"> ({toRoman(tile.built)})</span>}
				</b>
			</div>
			{unbuilt && <span className="notbuilt">(Not Built Yet)</span>}
		</div>
	);
}

/** one dot per level: filled for built levels, hollow for levels still in the queue */
function LevelDots({ tile }: { tile: TileState }) {
	const title = `Level ${tile.built}${tile.queued.length ? `, upgrading to ${tile.level}` : ""}`;

	return (
		<div className="dots" title={title}>
			{Array.from({ length: tile.level }, (_, index) => (
				<span
					key={`level-${index}`}
					className={`dot-level ${index < tile.built ? "on" : "queued"}`}
				/>
			))}

		</div>
	);
}

/** how much of the element this mine makes now, and after the next upgrade (until the level cap) */
function MineOutput({ tile }: { tile: TileState }) {
	const { element, pct, built, level } = tile;

	if (!element) return null;

	return (
		<div
			className="sub"
			title={`${element} makes up ${pct}% of this planet; richer deposits yield more per level`}
		>
			<b style={{ color: elementColor(element) }}>{element}</b> {pct}% · +
			{mineRate(built, pct).toFixed(1)}/s
			{/* show the next-level gain only until the building is maxed */}
			{level < MAX_BUILDING_LEVEL && (
				<>{/* next-level rate */} → +{mineRate(level + 1, pct).toFixed(1)}/s</>
			)}{" "}

			{/* the output gain of the next level, shown until the level cap */}
		</div>
	);
}

function NextLevel({ tile, cost }: { tile: TileState; cost: Resources }) {
	if (tile.level >= MAX_BUILDING_LEVEL)

		return <div className="sub good">Maximum level</div>;

	return (
		<>
			<div className="sub">
				Cost: <Cost cost={cost} />
			</div>{" "}
			{/* the price of the next level */}
			<div className="sub">
				{fmtTime(buildSeconds(tile.type, tile.level) * MS_PER_SECOND)}
			</div>
		</>
	);
}

/** time left on the building being built, with a bar of how much of its build time has already passed */
function BuildProgress({
	active,
	nowMs,
}: {
	active: QueueDTO | undefined;
	nowMs: number;
}) {
	if (!active) return null;

	const share = Math.min(
		PERCENT,
		((nowMs - active.startAt) / (active.finishAt - active.startAt)) * PERCENT,
	);

	return (
		<div className="grow-fill">
			<div className="sub good">{fmtTime(active.finishAt - nowMs)}</div>
			<div className="bar">
				<div style={{ width: `${share}%` }} />
			</div>{" "}
			{/* the bar fills as the build time passes */}
		</div>
	);
}

function buttonLabel(tile: TileState) {
	if (tile.level >= MAX_BUILDING_LEVEL) return "Max level";

	return tile.built === 0 ? "Build" : "Upgrade";
}

// Gathers everything one tile needs, so the tile itself only draws. Queued upgrades count towards the level so a second click targets the next one.
function tileState(type: string, props: Props): TileState {
	const queued = props.queue.filter((item) => item.type === type);
	const built = props.planet.buildings[type] ?? 0;
	const element = mineElement(type);
	const percent =
		props.composition.find((part) => part.symbol === element)?.pct ?? 0;

	return {
		type,
		info: buildingInfo(type)!,
		built,
		level: built + queued.length,
		queued,
		element,
		pct: percent,
	};
}

// One building's tile. A maxed building gets a fixed blocker message instead of a cost shortfall.
function BuildingTile({ type, props }: { type: string; props: Props }) {
	const tile = tileState(type, props);
	const cost = buildCost(type, tile.level);
	const maxed = tile.level >= MAX_BUILDING_LEVEL;
	const blocker = maxed
		? `Already at the maximum level (${toRoman(MAX_BUILDING_LEVEL)})`
		: props.shortfall(cost);

	return (
		<div className="tile" title={tile.info.desc}>
			<TileHead tile={tile} />
			<LevelDots tile={tile} />
			<MineOutput tile={tile} />
			<NextLevel tile={tile} cost={cost} />
			<BuildProgress active={tile.queued[0]} nowMs={props.nowMs} />
			<button
				disabled={!!blocker}
				title={blocker}
				onClick={() =>
					props.sendAction({ action: "build", planetId: props.planet.id, type })
				}

			>
				{buttonLabel(tile)}
			</button>
		</div>
	);
}

export default function Buildings(props: Props) {
	return (
		<div className="panel">
			<h2>{props.planet.name} — buildings</h2>
			<div className="tiles">
				{props.types.map((type) => (
					<BuildingTile key={type} type={type} props={props} />
				))}

			</div>
		</div>
	);
}
