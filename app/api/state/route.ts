import { NextResponse } from "next/server";
import { withGame } from "@/lib/server/engine";

export const dynamic = "force-dynamic";

/** ?sx=&sy= is the sector on the galaxy map, ?system= the solar system on screen */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : undefined);
  const { state } = await withGame(() => null, { sx: num("sx"), sy: num("sy"), system: num("system") });

  return NextResponse.json(state);
}
