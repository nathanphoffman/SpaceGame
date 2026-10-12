import { NextResponse } from "next/server";
import { withGame } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const { state } = await withGame(() => null);
  return NextResponse.json(state);
}
