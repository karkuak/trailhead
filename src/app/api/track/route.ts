import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics-server";

// Single ingestion endpoint for the analytics client (track/identify/page).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.event !== "string" || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "invalid event payload" }, { status: 400 });
  }
  const row = await recordEvent({
    event: body.event,
    userId: typeof body.userId === "string" ? body.userId : null,
    sessionId: body.sessionId,
    properties: body.properties ?? {},
  });
  return NextResponse.json({ ok: true, id: row.id });
}
