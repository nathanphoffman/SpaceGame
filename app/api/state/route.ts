import { NextResponse } from "next/server";
import { withGame } from "@/lib/server/engine";

export const dynamic = "force-dynamic";

/** ?sx=&sy= is the sector on the galaxy map, ?system= the solar system on screen */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const numeric = (key: string) => (params.has(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : undefined);
  const { state } = await withGame(() => null, { sx: numeric("sx"), sy: numeric("sy"), system: numeric("system") });

  return NextResponse.json(state);
}
