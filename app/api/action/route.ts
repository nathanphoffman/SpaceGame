import { NextResponse } from "next/server";
import { resetGame } from "@/lib/server/db";
import { GameError, startBuilding, buildShips, recallFleet, sendFleet, withGame } from "@/lib/server/engine";

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    if (body.action === "reset") await resetGame();

    // load what the client is looking at, plus any planets the action itself refers to
    const planetIds = [body.planetId, body.originId, body.targetId].filter((n) => Number.isInteger(n));
    const v = body.view ?? {};
    const view = { sx: v.sx, sy: v.sy, system: v.system, planets: planetIds };
    const { state } = await withGame((world, time) => {
      switch (body.action) {
        case "build": return startBuilding(world, time, body.planetId, body.type);

        case "ship": return buildShips(world, time, body.planetId, body.type, body.qty);

        case "send": return sendFleet(world, time, body.originId, body.targetId, body.ships ?? {});

        case "recall": return recallFleet(world, time, body.fleetId);

        case "reset": return;

        default: throw new GameError("Unknown action");
      }
    }, view);

    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: BAD_REQUEST });
    console.error(e);

    return NextResponse.json({ error: "Server error" }, { status: SERVER_ERROR });
  }
}
