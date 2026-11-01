import { NextResponse } from "next/server";
import { withGame } from "@/lib/server/engine";

export const dynamic = "force-dynamic";

/** ?sx=&sy= is the sector on the galaxy map, ?system= the solar system on screen */
export async function GET(request: Request) {
  const db = new URL(request.url).searchParams;

  const num = (k: string) => (db.has(k) && Number.isFinite(Number(db.get(k))) ? Number(db.get(k)) : undefined);
  const { state } = await withGame(() => null, { sx: num("sx"), sy: num("sy"), system: num("system") });

  return NextResponse.json(state);
}
