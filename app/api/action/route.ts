import { NextResponse } from "next/server";
import { resetGame } from "@/lib/db";
import { GameError, build, buildShips, recallFleet, sendFleet, withGame } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    if (body.action === "reset") await resetGame();

    // load what the client is looking at, plus any planets the action itself refers to
    const ids = [body.planetId, body.originId, body.targetId].filter((n) => Number.isInteger(n));
    const v = body.view ?? {};
    const view = { sx: v.sx, sy: v.sy, system: v.system, planets: ids };
    const { state } = await withGame((w, now) => {
      switch (body.action) {
        case "build": return build(w, now, body.planetId, body.type);

        case "ship": return buildShips(w, now, body.planetId, body.type, body.qty);

        case "send": return sendFleet(w, now, body.originId, body.targetId, body.ships ?? {});

        case "recall": return recallFleet(w, now, body.fleetId);

        case "reset": return;

        default: throw new GameError("Unknown action");
      }
    }, view);

    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
